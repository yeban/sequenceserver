require 'forwardable'

require 'sequenceserver/database'

# Define Database class.
module SequenceServer
  # Collection of Database objects.
  class Databases
    include Enumerable

    extend Forwardable

    def_delegators SequenceServer, :config, :sys

    def collection
      @collection ||= {}
    end

    private :collection

    def <<(database)
      collection[database.id] = database
    end

    def [](ids)
      ids = Array ids
      collection.values_at(*ids)
    end

    def ids
      collection.keys
    end

    def all
      collection.values
    end

    def each(&block)
      all.each(&block)
    end

    def include?(path)
      collection.include? Digest::MD5.hexdigest path
    end

    def group_by(&block)
      all.group_by(&block)
    end

    def to_json
      collection.values.to_json
    end

    # Retrieve given loci from the databases we have.
    #
    # loci to retrieve are specified as a String:
    #
    #    "accession_1,accession_2:start-stop,accession_3"
    #
    # Return value is a FASTA format String containing sequences in the same
    # order in which they were requested. If an accession could not be found,
    # a commented out error message is included in place of the sequence.
    # Sequences are retrieved from the first database in which the accession
    # is found. The returned sequences can, thus, be incorrect if accessions
    # are not unique across all database (admins should make sure of that).
    def retrieve(loci)
      # Exit early if loci is nil.
      return unless loci

      # String -> Array
      # We may have empty string if loci contains a double comma as a result
      # of typo (remember - loci is external input). These are eliminated.
      loci = loci.split(',').delete_if(&:empty?)

      # Each database is searched for each locus. For each locus, search is
      # terminated on the first database match.
      # NOTE: This can return incorrect sequence if the sequence ids are
      # not unique across all databases.
      seqs = loci.map do |locus|
        # Get sequence id and coords. coords may be nil. accession can't
        # be.
        accession, coords = locus.split(':')

        # Initialise a variable to store retrieved sequence.
        seq = nil

        # Go over each database looking for this accession.
        each do |database|
          # Database lookup  will return a string if given accession is
          # present in the database, nil otherwise.
          seq = database[accession, coords]
          # Found a match! Terminate iteration returning the retrieved
          # sequence.
          break if seq
        end

        # If accession was not present in any database, insert an error
        # message in place of the sequence. The line starts with '#'
        # and should be ignored by BLAST (not tested).
        unless seq
          seq = "# ERROR: #{locus} not found in any database"
        end

        # Return seq.
        seq
      end

      # Array -> String
      seqs.join("\n")
    end

    # Intended to be used only for testing.
    def first
      all.first
    end

    # Intended to be used only for testing.
    def clear
      collection.clear
    end
  end
end
