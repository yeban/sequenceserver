require 'digest/md5'
require 'forwardable'

require 'sequenceserver/sequence'

# Define Database class.
module SequenceServer
  # Captures a directory containing FASTA files and BLAST databases.
  #
  # Formatting a FASTA for use with BLAST+ will create 3 or 6 files,
  # collectively referred to as a BLAST database.
  #
  # It is important that formatted BLAST database files have the same dirname
  # and basename as the source FASTA for SequenceServer to be able to tell
  # formatted FASTA from unformatted. And that FASTA files be formatted with
  # `parse_seqids` option of `makeblastdb` for sequence retrieval to work.
  #
  # SequenceServer will always place BLAST database files alongside input FASTA,
  # and use `parse_seqids` option of `makeblastdb` to format databases.
  Database = Struct.new(:id, :name, :title, :type, :nsequences, :ncharacters,
                        :updated_on) do

    extend Forwardable

    def_delegators SequenceServer, :config, :sys

    def initialize(*args)
      args.unshift Digest::MD5.hexdigest args[0]
      args[3].downcase! # database type
      args.each(&:freeze)
      super
    end

    def [](accession, coords = nil)
      cmd = "blastdbcmd -db #{name} -entry '#{accession}'"
      if coords
        cmd << " -range #{coords}"
      end
      out, = sys(cmd, path: config[:bin])
      out.chomp
    rescue CommandFailed
      # Command failed beacuse stdout was empty, meaning accession not
      # present in this database.
      nil
    end

    def include?(accession)
      cmd = "blastdbcmd -entry '#{accession}' -db #{name}"
      out, = sys(cmd, path: config[:bin])
      !out.empty?
    end

    def ==(other)
      id == Digest::MD5.hexdigest(other.name)
    end

    def to_s
      "#{type}: #{title} #{name}"
    end

    def to_json(*args)
      to_h.to_json(*args)
    end
  end
end
