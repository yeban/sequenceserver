require 'yaml'

module SequenceServer
  module CLIOptions

    # OptSpec is a simple DSL to describe CLI options, and utility method to
    # check the validity of a CLI option string.
    module OptSpec

      class SpecFailed < StandardError; end
      class ParseError < StandardError; end

      # Option abstracts a CLI option accepted by BLAST+.  A CLI option has a
      # name, a description, and is limited by a set of constraints.
      class Option
        attr_accessor :name
        attr_accessor :description

        def initialize(name, &block)
          @name        = name
          @constraints = []
          instance_eval(&block)
        end

        # Does the given optcode match the specifications of this option?
        def validate(optcode)
          @constraints.each do |constraint|
            constraint.call(optcode)
          end
        end

        private

        alias Real Float

        # Describe an option.
        def describe(description)
          @description = description
        end

        def depends_on(*required_options)
          required_options = required_options.flatten
          @constraints << lambda do |optcode|
            input = optcode.map{|opt| opt.first}
            required_options.each do |ro|
              unless input.include?(ro)
                raise SpecFailed, "Option '#{name}' requires option '#{ro}' to work with."
              end
            end
          end
        end

        def incompatible_with(*incompatible_options)
          incompatible_options = incompatible_options.flatten
          @constraints << lambda do |optcode|
            input_options = optcode.map{|opt| opt.first}
            incompatible_options.each do |io|
              if input_options.include?(io)
                raise SpecFailed, "Option '#{name}' is incompatible with option '#{io}'."
              end
            end
          end
        end

        def value_should_be_one_of(*values)
          values = values.flatten
          @constraints << lambda do |optcode|
            value = optcode[name]
            unless values.include?(value)
              raise SpecFailed, "'#{name}' should be one of: #{values.join(', ')}."
            end
          end
        end

        def value_should_be_in_range(range)
          @constraints << lambda do |optcode|
            value = optcode[name]
            unless range.include?(value)
              raise SpecFailed, "'#{name}' should be within #{range.min} and #{range.max}."
            end
          end
        end

        def value_should_be_gte(threshold)
          @constraints << lambda do |optcode|
            value = optcode[name]
            unless value >= threshold
              raise SpecFailed, "'#{name}' should be greater than or equal to #{threshold}."
            end
          end
        end
        
        def value_should_be_of_format(matcher)
          @constraints << lambda do |optcode|
            value = optcode[name]
            unless matcher.match(value)
              raise SpecFailed, "#{name} should be of format #{matcher}."
            end
          end
        end

        def value_should_be_of_type(type)
          @constraints << lambda do |optcode|
            value = optcode[name]
            begin
              send(type, value)
            rescue ArgumentError, TypeError
              raise SpecFailed, "#{name} takes a #{type} value."
            end
          end
        end
      end

      # A Hash of all possible options.
      attr_reader :options

      # option a new option to the table of options.
      def option(name, &block)
        @options ||= {}
        @options[name] = Option.new(name, &block).freeze
      end

      def validate(argv)
        optcode = parse(argv)
        optcode.each do |name, value|
          begin
            spec = options.fetch(name)
          rescue KeyError
            return [false, "Option #{name} not supported."]
          end
          spec.validate(optcode)
        end

        true
      rescue ParseError, SpecFailed => e
        [false, e.to_s]
      end

      def parse(argv)
        optcode = YAML.load(argv) || {}
        unless optcode.is_a? Hash
          raise ParseError, "Options should be specified as a YAML map."
        end
        optcode
      rescue ArgumentError, SyntaxError
        raise ParseError, "Options should be specified as a YAML map."
      end
    end

    extend OptSpec

    option 'query_loc' do
      describe <<DESC
-query_loc <String>
  Location on the query sequence in 1-based offsets (Format: start-stop)
DESC
      value_should_be_of_type('String')
      value_should_be_of_format(/\w+-\w+/)
    end

    option 'task' do
      describe <<DESC
-task <String, Permissible values: 'blastp' 'blastp-short'>
  Task to execute
  Default = 'blastp'
DESC
      value_should_be_of_type('String')
      value_should_be_one_of('blastp', 'blastp-short')
    end

    option 'evalue' do
      describe <<DESC
-evalue <Real>
  Expectation value (E) threshold for saving hits
  Default = '10'
DESC
      value_should_be_of_type('Real')
    end

    option 'word_size' do
      describe <<DESC
-word_size <Integer, >=2>
  Word size for wordfinder algorithm
DESC
      value_should_be_of_type('Integer')
      value_should_be_gte(2)
    end

    option 'gapopen' do
      describe <<DESC
-gapopen <Integer>
  Cost to open a gap
DESC
      value_should_be_of_type('Integer')
    end

    option 'gapextend' do
      describe <<DESC
-gapextend <Integer>
      Cost to extend a gap
DESC
      value_should_be_of_type('Integer')
    end

    option 'matrix' do
      describe <<DESC
-matrix <String>
  Scoring matrix name (normally BLOSUM62)
DESC
      value_should_be_of_type('String')
      value_should_be_one_of('BLOSUM80', 'BLOSUM62', 'BLOSUM50', 'BLOSUM45', 'PAM250', 'BLOSUM90', 'PAM30', 'PAM70')
    end

    option 'threshold' do
      describe <<DESC
-threshold <Real, >=0>
  Minimum word score such that the word is optioned to the BLAST lookup table
DESC
      value_should_be_of_type('Real')
      value_should_be_gte(0)
    end

    option 'comp_based_stats' do
      describe <<DESC
-comp_based_stats <String>
  Use composition-based statistics for blastp / tblastn:
    D or d: default (equivalent to 2)
    0 or F or f: no composition-based statistics
    1: Composition-based statistics as in NAR 29:2994-3005, 2001
    2 or T or t : Composition-based score adjustment as in Bioinformatics
    21:902-911,
    2005, conditioned on sequence properties
    3: Composition-based score adjustment as in Bioinformatics 21:902-911,
    2005, unconditionally
    For programs other than tblastn, must either be absent or be D, F or 0
    Default = '2'"
DESC
      value_should_be_of_type('String')
    end

    option 'subject_loc' do
      describe <<DESC
-subject_loc <String>
  Location on the subject sequence in 1-based offsets (Format: start-stop)
DESC
      incompatible_with %w|db gilist seqidlist negative_gilist db_soft_mask db_hard_mask remote|
      value_should_be_of_type('String')
      value_should_be_of_format(/\w+-\w+/)
    end

    option 'show_gis' do
      describe <<DESC
-show_gis
  Show NCBI GIs in deflines?
DESC
    end

    option 'num_descriptions' do
      describe <<DESC
-num_descriptions <Integer, >=0>
  Number of database sequences to show one-line descriptions for
  Default = '500'
DESC
      value_should_be_of_type('Integer')
      value_should_be_gte(0)
    end

    option 'num_alignments' do
      describe <<DESC
-num_alignments <Integer, >=0>
  Number of database sequences to show alignments for
  Default = '250'
DESC
      value_should_be_of_type('Integer')
      value_should_be_gte(0)
    end

    option 'seg' do
      describe <<DESC
-seg <String>
  Filter query sequence with SEG (Format: 'yes', 'window locut hicut', or
  'no' to disable)
  Default = 'no'
DESC
      value_should_be_of_type('String')
    end

    option 'soft_masking' do
      describe <<DESC
-soft_masking <Boolean>
  Apply filtering locations as soft masks
  Default = 'false'
DESC
      value_should_be_of_format(/(true)|(false)/)
    end

    option 'lcase_masking' do
      describe <<DESC
-lcase_masking
  Use lower case filtering in query and subject sequence(s)?
DESC
    end

    option 'gilist' do
      describe <<DESC
-gilist <String>
  Restrict search of database to list of GI's
DESC
      incompatible_with %w|negative_gilist seqidlist remote subject subject_loc|
      value_should_be_of_type('String')
    end

    option 'seqidlist' do
      describe <<DESC
-seqidlist <String>
  Restrict search of database to list of SeqId's subject_loc
DESC
      incompatible_with %w|gilist negative_gilist remote subject|
      value_should_be_of_type('String')
    end

    option 'negative_gilist' do
      describe <<DESC
-negative_gilist <String>
  Restrict search of database to everything except the listed GIs
DESC
      incompatible_with %w|gilist seqidlist remote subject subject_loc|
      value_should_be_of_type('String')
    end

    option 'entrez_query' do
      describe <<DESC
-entrez_query <String>
  Restrict search with the given Entrez query
DESC
      depends_on 'remote'
      value_should_be_of_type('String')
    end

    option 'db_soft_mask' do
      describe <<DESC
-db_soft_mask <String>
  Filtering algorithm ID to apply to the BLAST database as soft masking
DESC
      incompatible_with %w|db_hard_mask subject subject_loc|
      value_should_be_of_type('String')
    end

    option 'db_hard_mask' do
      describe <<DESC
-db_hard_mask <String>
  Filtering algorithm ID to apply to the BLAST database as hard masking
DESC
      incompatible_with %w|db_soft_mask subject subject_loc|
      value_should_be_of_type('String')
    end

    option 'culling_limit' do
      describe <<DESC
-culling_limit <Integer, >=0>
  If the query range of a hit is enveloped by that of at least this many
  higher-scoring hits, delete the hit
DESC
      incompatible_with %w|best_hit_overhang best_hit_score_edge|
      value_should_be_of_type('Integer')
      value_should_be_gte(0)
    end

    option 'best_hit_overhang' do
      describe <<DESC
-best_hit_overhang <Real, (>=0 and =<0.5)>
  Best Hit algorithm overhang value (recommended value: 0.1)
DESC
      incompatible_with 'culling_limit'
      value_should_be_of_type('Real')
      value_should_be_in_range(0..0.5)
    end

    option 'best_hit_score_edge' do
      describe <<DESC
-best_hit_score_edge <Real, (>=0 and =<0.5)>
  Best Hit algorithm score edge value (recommended value: 0.1)
DESC
      incompatible_with 'culling_limit'
      value_should_be_of_type('Real')
      value_should_be_in_range(0..0.5)
    end

    option 'max_target_seqs' do
      describe <<DESC
-max_target_seqs <Integer, >=1>
  Maximum number of aligned sequences to keep
DESC
      value_should_be_of_type('Integer')
      value_should_be_gte(1)
    end

    option 'dbsize' do
      describe <<DESC
-dbsize <Int8>
  Effective length of the database
DESC
      value_should_be_of_type('Integer')
    end

    option 'searchsp' do
      describe <<DESC
-searchsp <Int8, >=0>
  Effective length of the search space
DESC
      value_should_be_of_type('Integer')
      value_should_be_gte(0)
    end

    option 'xdrop_ungap' do
      describe <<DESC
-xdrop_ungap <Real>
  X-dropoff value (in bits) for ungapped extensions
DESC
      value_should_be_of_type('Real')
    end

    option 'xdrop_gap' do
      describe <<DESC
-xdrop_gap <Real>
  X-dropoff value (in bits) for preliminary gapped extensions
DESC
      value_should_be_of_type('Real')
    end

    option 'xdrop_gap_final' do
      describe <<DESC
-xdrop_gap_final <Real>
  X-dropoff value (in bits) for final gapped alignment
DESC
      value_should_be_of_type('Real')
    end

    option 'window_size' do
      describe <<DESC
-window_size <Integer, >=0>
  Multiple hits window size, use 0 to specify 1-hit algorithm
DESC
      value_should_be_of_type('Integer')
      value_should_be_gte(0)
    end

    option 'ungapped' do
      describe <<DESC
-ungapped
  Perform ungapped alignment only?
DESC
    end

    option 'parse_deflines' do
      describe <<DESC
-parse_deflines
  Should the query and subject defline(s) be parsed?
DESC
    end

    option 'remote' do
      describe <<DESC
-remote
  Execute search remotely?
DESC
      incompatible_with %w|gilist seqidlist negative_gilist subject_loc num_threads|
    end

    option 'use_sw_tback' do
      describe <<DESC
-use_sw_tback
  Compute locally optimal Smith-Waterman alignments?
DESC
    end
  end
end
