require 'yaml'
require 'sequenceserver/database'

module SequenceServer
  class NameGenerator

    def initialize fname
      @fname = fname
    end

    def get
      [make_title, yaml_tax_id]
    end

    private
    def make_title
      species = @fname.split("/")[-2].gsub("_", " ")
      make_prefix + "#{species} - #{Database.make_db_title(File.basename @fname)}"
    end

    def yaml_tax_id
      each_compressed do |info|
        info["taxid"] || 0
      end || 0
    end

    def make_prefix
      each_compressed do |info|
        if info["family"] != "Formicidae"
          "[Outgroup] "
        elsif @fname.split("/")[-5] == "reads"
          "[Raw unassembled reads] "
        else
          ""
        end
      end || ""
    end

    def each_compressed
      ["gz","bam","zip","bz2","tgz"].each do |ext|
        f = "#{@fname}.#{ext}.yaml"
        if File.exist? f
          return yield(YAML.load_file f)
        end
      end
      nil
    end

  end
end
