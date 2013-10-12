# sequenceserver.rb

require 'sinatra/base'
require 'yaml'
require 'logger'
require 'fileutils'
require 'sequenceserver/helpers'
require 'sequenceserver/blast'
require 'sequenceserver/sequencehelpers'
require 'sequenceserver/sinatralikeloggerformatter'
require 'sequenceserver/customisation'

# Helper module - initialize the blast server.
module SequenceServer
  class App < Sinatra::Base
    include Helpers::SystemHelpers
    include SequenceHelpers
    include SequenceServer::Customisation

    # Basic configuration settings for app.
    configure do
      # enable some builtin goodies
      enable :session, :logging

      # main application file
      set :app_file,   File.expand_path(__FILE__)

      # app root is SequenceServer's installation directory
      #
      # SequenceServer figures out different settings, location of static
      # assets or templates for example, based on app root.
      set :root,       File.dirname(File.dirname(app_file))

      # path to test database
      #
      # SequenceServer ships with test database (fire ant genome) so users can
      # launch and preview SequenceServer without any configuration, and/or run
      # test suite.
      set :test_database, File.join(root, 'tests', 'database')

      set :log,       Logger.new(STDERR)
      log.formatter = SinatraLikeLogFormatter.new()
    end

    configure :development do
      log.level     = Logger::DEBUG
    end

    configure(:production) do
      log.level     = Logger::INFO
      error do
        erb :'500'
      end
      not_found do
        erb :'500'
      end
    end

    # A Hash of absolute path to BLAST binaries indexed by its name.
    attr_reader :binaries

    # A Hash of BLAST databases indexed by their id (or hash).
    attr_reader :databases

    # An Integer stating the number of threads to use for running BLASTs.
    attr_reader :num_threads

    def initialize(config_file)
      config = YAML.load_file config_file
      unless config
        settings.log.warn("Empty configuration file: #{config_file} - will assume default settings")
        config = {}
      end

      bin_dir   = File.expand_path(config.delete 'bin') rescue nil
      @binaries = scan_blast_executables(bin_dir).freeze
      @binaries.each do |command, path|
        settings.log.info("Found #{command} at #{path}")
      end

      database_dir = File.expand_path(config.delete 'database') rescue settings.test_database
      @databases   = scan_blast_db(database_dir, binaries['blastdbcmd']).freeze
      databases.each do |id, database|
        settings.log.info("Found #{database.type} database: #{database.title} at #{database.name}")
      end

      @num_threads = Integer(config.delete 'num_threads') rescue 4567
      settings.log.info("Will use #@num_threads threads to run BLAST.")

      # Sinatra, you do your magic now.
      super()
    end

    get '/' do
      erb :search
    end

    before '/' do
      pass if params.empty?

      # ensure required params present
      #
      # If a required parameter is missing, SequnceServer returns 'Bad Request
      # (400)' error.
      #
      # See Twitter's [Error Codes & Responses][1] page for reference.
      #
      # [1]: https://dev.twitter.com/docs/error-codes-responses

      if params[:method].nil? or params[:method].empty?
         halt 400, "No BLAST method provided."
      end

      if params[:sequence].nil? or params[:sequence].empty?
         halt 400, "No input sequence provided."
      end

      if params[:databases].nil?
         halt 400, "No BLAST database provided."
      end

      # ensure params are valid #

      # only allowed blast methods should be used
      blast_methods = %w|blastn blastp blastx tblastn tblastx|
      unless blast_methods.include?(params[:method])
        halt 400, "Unknown BLAST method: #{params[:method]}."
      end

      # check the advanced options are sensible
      begin #FIXME
        validate_advanced_parameters(params[:advanced])
      rescue ArgumentError => error
        halt 400, "Advanced parameters invalid: #{error}"
      end

      # log params
      settings.log.debug('method: '   + params[:method])
      settings.log.debug('sequence: ' + params[:sequence])
      settings.log.debug('database: ' + params[:databases].inspect)
      settings.log.debug('advanced: ' + params[:advanced])
    end

    post '/' do
      method        = params['method']
      databases     = params[:databases]
      sequence      = params[:sequence]
      advanced_opts = params['advanced']

      # blastn implies blastn, not megablast; but let's not interfere if a user
      # specifies `task` herself
      if method == 'blastn' and not advanced_opts =~ /task/
        advanced_opts << ' -task blastn '
      end

      method    = binaries[ method ]
      databases = params[:databases].map{|index|
        self.databases[index].name
      }
      advanced_opts << " -num_threads #{num_threads}"

      # run blast and log
      blast = Blast.new(method, sequence, databases.join(' '), advanced_opts)
      blast.run!
      settings.log.info('Ran: ' + blast.command)

      unless blast.success?
        halt(*blast.error)
      end

      format_blast_results(blast.result, databases)
    end

    # get '/get_sequence/?id=sequence_ids&db=retreival_databases'
    #
    # Use whitespace to separate entries in sequence_ids (all other chars exist
    # in identifiers) and retreival_databases (we don't allow whitespace in a
    # database's name, so it's safe).
    get '/get_sequence/' do
      sequenceids = params[:id].split(/\s/).uniq  # in a multi-blast
      # query some may have been found multiply
      retrieval_databases = params[:db].split(/\s/)

      settings.log.info("Looking for: '#{sequenceids.join(', ')}' in '#{retrieval_databases.join(', ')}'")

      # the results do not indicate which database a hit is from.
      # Thus if several databases were used for blasting, we must check them all
      # if it works, refactor with "inject" or "collect"?
      found_sequences     = ''

      retrieval_databases.each do |database|     # we need to populate this session variable from the erb.
        sequence = sequence_from_blastdb(sequenceids, database)
        if sequence.empty?
          settings.log.debug("'#{sequenceids.join(', ')}' not found in #{database}")
        else
          found_sequences += sequence
        end
      end

      found_sequences_count = found_sequences.count('>')

      out = ''
      # just in case, checking we found right number of sequences
      if found_sequences_count != sequenceids.length
        out << <<HEADER
<h1>ERROR: incorrect number of sequences found.</h1>
<p>Dear user,</p>

<p><strong>We have found
<em>#{found_sequences_count > sequenceids.length ? 'more' : 'less'}</em>
sequence than expected.</strong></p>

<p>This is likely due to a problem with how databases are formatted. 
<strong>Please share this text with the person managing this website so 
they can resolve the issue.</strong></p>

<p> You requested #{sequenceids.length} sequence#{sequenceids.length > 1 ? 's' : ''}
with the following identifiers: <code>#{sequenceids.join(', ')}</code>,
from the following databases: <code>#{retrieval_databases.join(', ')}</code>.
But we found #{found_sequences_count} sequence#{found_sequences_count> 1 ? 's' : ''}.
</p>

<p>If sequences were retrieved, you can find them below (but some may be incorrect, so be careful!).</p>
<hr/>
HEADER
      end

      out << "<pre><code>#{found_sequences}</pre></code>"
      out
    end

    def format_blast_results(result, databases)
      formatted_result = ''
      @all_retrievable_ids = []
      string_of_used_databases = databases.join(' ')
      blast_database_number = 0
      line_number = 0
      finished_database_summary = false
      finished_alignments = false
      reference_string = ''
      database_summary_string = ''
      result.each do |line|
        line_number += 1
        next if line_number <= 5 #skip the first 5 lines

        # Add the reference to the end, not the start, of the blast result
        if line_number >= 7 and line_number <= 15
          reference_string += line
          next
        end

        if !finished_database_summary and line_number > 15
          database_summary_string += line
          finished_database_summary = true if line.match(/total letters/)
          next
        end

        # Remove certain lines from the output
        skipped_lines = [/^<\/BODY>/,/^<\/HTML>/,/^<\/PRE>/]
        skip = false
        skipped_lines.each do |skippy|
        #  $stderr.puts "`#{line}' matches #{skippy}?"
          if skippy.match(line)
            skip = true
         #   $stderr.puts 'yes'
          else
          #  $stderr.puts 'no'
          end
        end
        next if skip

        # Remove the javascript inclusion
        line.gsub!(/^<script src=\"blastResult.js\"><\/script>/, '')

        if line.match(/^>/) # If line to possibly replace
          # Reposition the anchor to the end of the line, so that it both still works and
          # doesn't interfere with the diagnostic space at the beginning of the line.
          #
          # There are two cases:
          #
          # database formatted _with_ -parse_seqids
          line.gsub!(/^>(.+)(<a.*><\/a>)(.*)/, '>\1\3\2')
          #
          # database formatted _without_ -parse_seqids
          line.gsub!(/^>(<a.*><\/a>)(.*)/, '>\2\1')

          # get hit coordinates -- useful for linking to genome browsers
          hit_length      = result[line_number..-1].index{|l| l =~ />lcl|Lambda/}
          hit_coordinates = result[line_number, hit_length].grep(/Sbjct/).
            map(&:split).map{|l| [l[1], l[-1]]}.flatten.map(&:to_i).minmax

          # Create the hyperlink (if required)
          formatted_result += construct_sequence_hyperlink_line(line, databases, hit_coordinates)
        else
          # Surround each query's result in <div> tags so they can be coloured by CSS
          if matches = line.match(/^<b>Query=<\/b> (.*)/) # If starting a new query, then surround in new <div> tag, and finish the last one off
            line = "<div class=\"resultn\" id=\"#{matches[1]}\">\n<h3>Query= #{matches[1]}</h3><pre>"
            unless blast_database_number == 0
              line = "</pre></div>\n#{line}"
            end
            blast_database_number += 1
          elsif line.match(/^  Database: /) and !finished_alignments
            formatted_result += "</div>\n<pre>#{database_summary_string}\n\n"
            finished_alignments = true
          end
          formatted_result += line
        end
      end
      formatted_result << "</pre>"

      link_to_fasta_of_all = "/get_sequence/?id=#{@all_retrievable_ids.join(' ')}&db=#{string_of_used_databases}"
      # #dbs must be sep by ' '
      retrieval_text       = @all_retrievable_ids.empty? ? '' : "<a href='#{url(link_to_fasta_of_all, false)}'>FASTA of #{@all_retrievable_ids.length} retrievable hit(s)</a>"

      "<h2>Results</h2>"+
      retrieval_text +
      "<br/><br/>" +
      formatted_result +
      "<br/>" +
      "<pre>#{reference_string.strip}</pre>"
    end

    def construct_sequence_hyperlink_line(line, databases, hit_coordinates)
      matches = line.match(/^>(.+)/)
      sequence_id = matches[1]

      link = nil

      # If a custom sequence hyperlink method has been defined,
      # use that.
      options = {
        :sequence_id => sequence_id,
        :databases => databases,
        :hit_coordinates => hit_coordinates
      }

      # First precedence: construct the whole line to be customised
      if self.respond_to?(:construct_custom_sequence_hyperlinking_line)
        settings.log.debug("Using custom hyperlinking line creator with sequence #{options.inspect}")
        link_line = construct_custom_sequence_hyperlinking_line(options)
        unless link_line.nil?
          return link_line
        end
      end

      # If we have reached here, custom construction of the
      # whole line either wasn't defined, or returned nil
      # (indicating failure)
      if self.respond_to?(:construct_custom_sequence_hyperlink)
        settings.log.debug("Using custom hyperlink creator with sequence #{options.inspect}")
        link = construct_custom_sequence_hyperlink(options)
      else
        settings.log.debug("Using standard hyperlink creator with sequence `#{options.inspect}'")
        link = construct_standard_sequence_hyperlink(options)
      end

      # Return the BLAST output line with the link in it
      if link.nil?
        settings.log.debug('No link added link for: `' + sequence_id + '\'')
        return line
      else
        settings.log.debug('Added link for: `' + sequence_id + '\''+ link)
        return "><a href='#{url(link, false)}' target='_blank'>#{sequence_id}</a> \n"
      end

    end

    # Advanced options are specified by the user. Here they are checked for interference with SequenceServer operations.
    # raise ArgumentError if an error has occurred, otherwise return without value
    def validate_advanced_parameters(advanced_options)
      raise ArgumentError, "Invalid characters detected in the advanced options" unless advanced_options =~ /\A[a-z0-9\-_\. ']*\Z/i
      disallowed_options = %w(-out -html -outfmt -db -query)
      disallowed_options.each do |o|
        raise ArgumentError, "The advanced BLAST option \"#{o}\" is used internally by SequenceServer and so cannot be specified by the you" if advanced_options =~ /#{o}/i
      end
    end
  end
end
