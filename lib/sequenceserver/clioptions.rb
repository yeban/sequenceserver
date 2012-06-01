require 'yaml'

module SequenceServer
  module CLIOptions

    # OptSpec is a simple framework to describe CLI options for BLAST+ and
    # validate user input against the specification.
    #
    # Each option is defined as a set of constraints that a user input must
    # 'pass' for it to be considered 'valid'.  User input is expected to be a
    # YAML map, so parsing is taken care of by existing YAML libraries.
    # Converting a YAML map to CLI format is trivial.
    module OptSpec

      class SpecFailed < StandardError; end
      class ParseError < StandardError; end

      alias Real Float

      # Describe an option.
      def describe(description)
        (specs[@method][:description][@category] ||= []) << description
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
      
      def value_should_be_gte(threshold)
        @constraints << lambda do |optcode|
          value = optcode[name]
          unless value <= threshold
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

      # A Hash of all possible options.
      #attr_reader :specs
      attr_reader :description

      def specs
        @specs ||= Hash.new {|h, k| h[k] = Hash.new {|h, k| h[k] = []}}
      end

      def method(name)
        @method = name
        specs[name]
        yield
        @method = nil
      end

      def common
        @method = 'common'
        yield
        common = specs.delete(@method)
        specs.each do |method, constraints|
          constraints.merge!(common)
        end
        @method = nil
      end

      # option a new option to the table of options.
      def option(name, &block)
        @constraints = specs[@method][name]
        yield if block_given?
        @constraints = nil
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

    method 'blastp' do
      option 'task' do
        value_should_be_of_type('String')
        value_should_be_one_of('blastp', 'blastp-short')
      end
    end

    method 'blastx' do
    end

    method 'blastn' do
      option 'strand' do
        value_should_be_of_type('String')
        value_should_be_one_of('both', 'minus', 'plus')
      end

      option 'task' do
        value_should_be_of_type('String')
        value_should_be_one_of('blastn', 'blastn-short', 'dcmegablast', 'megablast', 'vecscreen')
      end

      option 'word_size' do
        value_should_be_of_type('Integer')
        value_should_be_gte(4)
      end

      option 'penalty' do
        value_should_be_of_type('Integer')
        value_should_be_lte(0)
      end

      option 'reward' do
        value_should_be_of_type('Integer')
        value_should_be_gte(0)
      end

      option 'use_index'

      option 'index_name' do
        value_should_be_of_type('String')
      end

      option 'dust' do
        value_should_be_of_type('String')
        value_should_be_of_format('^(yes|no|\d\s\d\s\d)$')
      end
    end

    method 'tblastx' do
    end

    method 'tblastn' do
    end

    common do
      option 'query_loc' do
        value_should_be_of_type('String')
        value_should_be_of_format(/\w+-\w+/)
      end

      option 'evalue' do
        value_should_be_of_type('Real')
      end

      option 'word_size' do
        value_should_be_of_type('Integer')
        value_should_be_gte(2)
      end

      option 'gapopen' do
        value_should_be_of_type('Integer')
      end

      option 'gapextend' do
        value_should_be_of_type('Integer')
      end

      option 'matrix' do
        value_should_be_of_type('String')
        value_should_be_one_of('BLOSUM80', 'BLOSUM62', 'BLOSUM50', 'BLOSUM45', 'PAM250', 'BLOSUM90', 'PAM30', 'PAM70')
      end

      option 'threshold' do
        value_should_be_of_type('Real')
        value_should_be_gte(0)
      end

      option 'comp_based_stats' do
        value_should_be_of_type('String')
      end

      option 'subject_loc' do
        incompatible_with %w|db gilist seqidlist negative_gilist db_soft_mask db_hard_mask remote|
        value_should_be_of_type('String')
        value_should_be_of_format(/\w+-\w+/)
      end

      option 'show_gis'

      option 'num_descriptions' do
        value_should_be_of_type('Integer')
        value_should_be_gte(0)
      end

      option 'num_alignments' do
        value_should_be_of_type('Integer')
        value_should_be_gte(0)
      end

      option 'seg' do
        value_should_be_of_type('String')
      end

      option 'soft_masking' do
        value_should_be_of_format(/(true)|(false)/)
      end

      option 'lcase_masking'

      option 'gilist' do
        incompatible_with %w|negative_gilist seqidlist remote subject subject_loc|
        value_should_be_of_type('String')
      end

      option 'seqidlist' do
        incompatible_with %w|gilist negative_gilist remote subject|
        value_should_be_of_type('String')
      end

      option 'negative_gilist' do
        incompatible_with %w|gilist seqidlist remote subject subject_loc|
        value_should_be_of_type('String')
      end

      option 'entrez_query' do
        depends_on 'remote'
        value_should_be_of_type('String')
      end

      option 'db_soft_mask' do
        incompatible_with %w|db_hard_mask subject subject_loc|
        value_should_be_of_type('String')
      end

      option 'db_hard_mask' do
        incompatible_with %w|db_soft_mask subject subject_loc|
        value_should_be_of_type('String')
      end

      option 'culling_limit' do
        incompatible_with %w|best_hit_overhang best_hit_score_edge|
        value_should_be_of_type('Integer')
        value_should_be_gte(0)
      end

      option 'best_hit_overhang' do
        incompatible_with 'culling_limit'
        value_should_be_of_type('Real')
        value_should_be_in_range(0..0.5)
      end

      option 'best_hit_score_edge' do
        incompatible_with 'culling_limit'
        value_should_be_of_type('Real')
        value_should_be_in_range(0..0.5)
      end

      option 'max_target_seqs' do
        value_should_be_of_type('Integer')
        value_should_be_gte(1)
      end

      option 'dbsize' do
        value_should_be_of_type('Integer')
      end

      option 'searchsp' do
        value_should_be_of_type('Integer')
        value_should_be_gte(0)
      end

      option 'xdrop_ungap' do
        value_should_be_of_type('Real')
      end

      option 'xdrop_gap' do
        value_should_be_of_type('Real')
      end

      option 'xdrop_gap_final' do
        value_should_be_of_type('Real')
      end

      option 'window_size' do
        value_should_be_of_type('Integer')
        value_should_be_gte(0)
      end

      option 'ungapped'

      option 'parse_deflines'

      option 'remote' do
        incompatible_with %w|gilist seqidlist negative_gilist subject_loc num_threads|
      end

      option 'use_sw_tback'
    end
  end
end

puts SequenceServer::CLIOptions.specs['blastn'].map(&:first)
