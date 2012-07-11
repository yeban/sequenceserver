require 'open3'

module SequenceServer
  module CLIOptions

    extend self

    # A Hash of all possible options.
    attr_reader :options

    # An Array of options that are banned by SequenceServer.
    attr_reader :banned

    #OPTSPEC = %x|#{SequenceServer::App.binaries[:blastp]} -help|
    OPTSPEC = %x|blastp -help|

    # Add a new option to the table of options.
    def add(name, description, requires = [], incompatible_with = [])
      name           = name.to_sym
      properties     = {:description      => description.to_s,
                        :requires         => Array(requires),
                        :incomptible_with => Array(incompatible_with)}

      @options[name] = properties
    end

    def generate
      @banned = [:h, :help, :version, :query, :db, :out, :subject, :outfmt, :html, :import_search_strategy, :export_search_strategy]

      create_range_constraint = lambda do |min, max|
        min   =  min || 0
        max   =  max || 1.0/0
        range =  min..max
        lambda {|v| range.include? v}
      end

      name, condition, description, requires, incompatible_with = nil

      OPTSPEC.each_line do |line|
        line.strip!

        if line.match(/^-(\w*)\s(<(.+)>)*/)
          if name
            # process previous options
            puts "
add '#{name}' do
  self.description = \"#{description.join("\n")}\"
  self.requires = #{requires}
  self.incompatible_with = #{incompatible_with}
  self.condition = #{condition}
end"

            #constraints = define_constraints(condition)
            #p "****************************"

            name = condition = description = requires = incompatible_with = nil
          end

          name = Regexp.last_match[1].to_sym

          if @banned.include? name
            name = nil
            next
          end

          condition = Regexp.last_match[3].split(', ')
          next
        end

        if name and line.match(/Requires:\s*(.*)/)
          requires = Regexp.last_match[1].split(/, /)
          next
        end

        if name and line.match(/Incompatible with:\s*(.*)/)
          incompatible_with = Regexp.last_match[1].split(/, /)
          next
        end

        if name and not (line.match(/\*\*\*/) or line.empty?)
          (description ||= []) << line
          next
        end
      end
    end

    def define_constraints(condition)
      return unless condition

      type, range = condition

      cast = lambda do |v|
        case range
        when "Integer"
          v.to_i
        when "Real"
          v.to_f
        when "String"
          v.to_s
        end
      end

      range_constraint = if range and range.match(/Permissible values: (.*)/)
                           list = Regexp.last_match[1].split
                           define_range_constraint(list)
                         elsif range and range.match(/>=(\d\.?\d?)( and =<(\d\.?\d?))*/)
                           min = cast.call Regexp.last_match[1]
                           max = cast.call Regexp.last_match[3]
                           define_range_constraint(min, max)
                         end

      [range_constraint]
    end

    def define_range_constraint(min_or_array, max = nil)
      if min_or_array.is_a? Array
        range = min_or_array
      else
        min   = min || 0
        max   = max || 1.0/0
        range = (min..max)
      end

      lambda {|v| range.include? v}
    end

    def parse(options)
    end
  end
end

SequenceServer::CLIOptions.generate
