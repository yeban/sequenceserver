require 'erb'

module SequenceServer

  module UniProt
    SINV = YAML.load_file("#{__dir__}/uniprot/sinv.yml")
  end

  module Ensembl
    URL_FMT = 'http://metazoa.ensembl.org/%s/Location/View?r=%s:%d-%d'
    SPECIES = ['Apis_mellifera', 'Atta_cephalotes', 'Solenopsis_invicta',
               'Nasonia_vitripennis' ]

    extend self

    def url(species, scaffold, start, stop)
      return unless species && scaffold
      return unless SPECIES.include? species
      URL_FMT % [species, scaffold, start, stop]
    end
  end

  module Hymenopterabase
    URL_FMT = 'http://hymenopteragenome.org:8080/%s/jbrowse/?loc=%s:%d..%d'
    SPECIES = {
      'Apis_mellifera'          => 'Amel_4.5',
      'Lasioglossum_albipes'    => 'Lalb_v2',
      'Bombus_impatiens'        => 'Bimp_2.0_NCBI',
      'Bombus_terrestris'       => 'Bter_1.0',
      'Nasonia_vitripennis'     => 'Nvit_2.0',
      'Acromyrmex_echinatior'   => 'Aech_2.0',
      'Atta_cephalotes'         => 'Acep_1.0',
      'Camponotus_floridanus'   => 'Cflo_3.3',
      'Cardiocondyle_obscurior' => 'Cobs_1.4',
      'Harpeganthos_saltator'   => 'Hsal_3.3',
      'Linepithema_humile'      => 'Lhum_1.0',
      'Pogonymex_barbatus'      => 'Pbar_1.0',
      'Solenopsis_invicta'      => 'Sinv_1.'
    }

    extend self

    def url(species, scaffold, start, stop)
      return unless species && scaffold
      return unless SPECIES.include? species
      URL_FMT % [SPECIES[species], scaffold, start, stop]
    end
  end

  module Links
    include ERB::Util

    alias_method :encode, :url_encode

    NCBI_ID_PATTERN    = /gi\|(\d+)\|/
    UNIPROT_ID_PATTERN = /sp\|(\w+)\|/

    def sequence_viewer
      accession  = encode self.accession
      database_ids = encode querydb.map(&:id).join(' ')
      url = "get_sequence/?sequence_ids=#{accession}" \
            "&database_ids=#{database_ids}"

      {
        :order => 0,
        :url   => url,
        :title => 'Sequence',
        :class => 'view-sequence',
        :icon  => 'fa-eye'
      }
    end

    def fasta_download
      accession  = encode self.accession
      database_ids = encode querydb.map(&:id).join(' ')
      url = "get_sequence/?sequence_ids=#{accession}" \
            "&database_ids=#{database_ids}&download=fasta"

      {
        :order => 1,
        :title => 'FASTA',
        :url   => url,
        :class => 'download',
        :icon  => 'fa-download'
      }
    end

    def hymenoptera_base
      scaffold = /[^\s\\]*[a-z][0-9]{1,100}/.match(title)
      url = Hymenopterabase.url(species, scaffold, *coords)
      return unless url

      {
        order: 2,
        title: 'Hymenopterabase',
        url: url,
        icon: 'fa-external-link'
      }
    end

    def ensembl
      scaffold = /[^\s\\]*[a-z][0-9]{1,100}/.match(title)
      url = Ensembl.url(species, scaffold, *coords)
      return unless url

      {
        order: 2,
        title: 'Ensembl',
        url: url,
        icon: 'fa-external-link'
      }
    end

    # UniProt link generator for SI2.2.0.
    def uniprot_sinv
      return nil unless id.match(/SI2.2.0_(\d*)/)
      key = "SINV_#{Regexp.last_match[1]}"
      uid = UniProt::SINV[key]
      return unless uid

      {
        :order => 3,
        :title => 'UniProt',
        :icon  => 'fa-external-link',
        :url   => "http://www.uniprot.org/uniprot/#{uid}"
      }
    end

    # Built-in ncbi link generator.
    def ncbi
      return nil unless id.match(NCBI_ID_PATTERN)
      ncbi_id = Regexp.last_match[1]
      ncbi_id = encode ncbi_id
      url = "http://www.ncbi.nlm.nih.gov/#{querydb.first.type}/#{ncbi_id}"
      {
        :order => 3,
        :title => 'NCBI',
        :url   => url,
        :icon  => 'fa-external-link'
      }
    end

    # Built-in uniprot link generator.
    def uniprot
      return nil unless id.match(UNIPROT_ID_PATTERN)
      uniprot_id = Regexp.last_match[1]
      uniprot_id = encode uniprot_id
      url = "http://www.uniprot.org/uniprot/#{uniprot_id}"
      {
        :order => 3,
        :title => 'UniProt',
        :url   => url,
        :icon  => 'fa-external-link'
      }
    end

    private

    def species
      whichdb.first.name.split('/')[-2]
    end

    def coords
      [hsps.map(&:sstart).min, hsps.map(&:send).max]
    end
  end
end

# [1]: https://stackoverflow.com/questions/2824126/whats-the-difference-between-uri-escape-and-cgi-escape
