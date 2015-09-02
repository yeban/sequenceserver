require 'yaml'

module SequenceServer
  class NameGenerator

    def initialize(fname, dirty_name)
      @fname = fname
      @path_segs = @fname.split('/')
      @dirty_name = dirty_name
    end

    def get
      [make_title, yaml_tax_id]
    end

    private
    def make_title
      species = @path_segs[-2].gsub('_', ' ')
      clean = extract_from_dirty
      suffix = (clean =~ /^\s*$/) ? '' : " - #{clean}"
      make_prefix + species + suffix
    end

    def yaml_tax_id
      each_compressed do |info|
        info['taxid']
      end || 0
    end

    def make_prefix
      prefix = ''
      if @path_segs[-3] == 'genome'
        prefix += '[Genome] '
      elsif @path_segs[-3] == 'transcripts'
        prefix += '[Transcriptome] '
      end

      each_compressed do |info|
        if info['family'] != 'Formicidae'
          prefix += '[Outgroup] '
        end
      end

      prefix
    end

    def each_compressed
      ['gz','bam','zip','bz2','tgz'].each do |ext|
        f = "#{@fname}.#{ext}.yaml"
        if File.exist? f
          yield(YAML.load_file f)
        end
      end
      nil
    end

    def extract_from_dirty
      suffix = ''

      ['OGS', 'GCA', 'monogynous', 'polygynous'].each do |name|
	suffix << ((@dirty_name.include? name) ? name + ' ' : '')
      end

      suffix << ((@dirty_name.include? 'Si gnF') ? 'Si_gnF' : '')
      suffix << ((@dirty_name.include? 'formica exsecta assembled transcriptome v1') ? '(Badouin et al) ' : '')
      suffix << ((@dirty_name.include? 'Trinity formica exsecta') ? '(Morandin et al) ' : '')

      parts = @dirty_name.split('.')

      parts.each do |part|
        suffix << (clean(part.scan(/\d/).join('')) + '.')
      end

      clean(suffix)
    end

    def clean(name_seg)
      cleaned = name_seg.chomp('.').lstrip
      if cleaned.start_with? '.'
	cleaned = cleaned[/.(.*)/m,1]
      end
      cleaned
    end

  end
end
