module SequenceServer
  module Customisation

    # TODO: move this module to another file perhaps
    module Uniprot
      require 'yaml'
      SINV = YAML.load_file('./ext/uniprot/sinv.yml')
    end

    def default_link(options)
      case options[:sequence_id]
      when /^lcl\|([^\s]*)/
        id = $1
        (@all_retrievable_ids ||= []) << id
        "/get_sequence/?id=#{id}&db=#{options[:databases].join(' ')}" # several dbs... separate by ' '
      end
    end

    # Hook into SequenceServer's BLAST result formatting process to insert
    # links to Hymenopterabase Genome Browser, and/or Uniprot page
    # corresponding to a 'hit'.
    def construct_custom_sequence_hyperlinking_line(options)
      line = "><a href='#{url(default_link(options))}'>#{options[:sequence_id]}</a>"
      case options[:sequence_id]
      when /^lcl\|(PB.*-RA) /
        # pbar cds and protein
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/pbarbatus_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|pbar_(scf\d*) /
        # pbar genomic
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/pbarbatus_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /lcl\|SI2.2.0/ # => sinv
        sid = options[:sequence_id]

        # construct Hymenopterabase genome browser link
        bid = sid.match(/locus=(Si_gnF.scaffold\d*)\[/)[1]
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/sinvicta_1/?name=#{bid}"

        # construct uniprot link
        ukey = sid.match(/SI2.2.0_(\d*)/)[1]
        uid  = Uniprot::SINV["SINV_#{ukey}"]
        uniprot = "http://www.uniprot.org/uniprot/#{uid}"

        # construct the entire line
        line << " [<a href='#{browser}'>Genome Browser</a>] [<a href='#{uniprot}'>Uniprot</a>]\n"
      when /^lcl\|(Si_gnF.scaffold\d*) /
        # sinv genomic
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/sinvicta_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|(LH\d*-RA) /
        # lhum cds and protein
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/lhumile_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|(scf\d*) /
        # lhum genomic
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/lhumile_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|(ACEP_\d*-RA) /
        # acep cds and protein
        id = $1.gsub(/EP_000/, '')
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/acephalotes_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Acep_(scaffold\d*) /
        # acep genomic
        id = $1
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/acephalotes_1/?name=#{id}:#{options[:hit_coordinates].join('..')}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Cflo_(\d*)--/
        # cflo cds and protein
        id = "CFLO#{$1}-RA"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/cfloridanus_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Cflo_gn3.3_((scaffold\d*)|(C\d*)) /
        # cflo genomic
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/cfloridanus_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Hsal_(\d*)--/
        # hsal cds and protein
        id = "HSAL#{$1}-RA"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/hsaltator_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Hsal_gn3.3_((scaffold\d*)|(C\d*)) /
        # hsal genomic
        id = "#{$1}:#{options[:hit_coordinates].join('..')}"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/hsaltator_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      else
        # Parsing the sequence_id didn't work. Don't include a hyperlink for this
        # sequence_id, but log that there has been a problem.
        settings.log.warn "Unable to parse sequence id `#{options[:sequence_id]}'"
        # Return nil so no hyperlink is generated.
        return nil
      end
      line
    end
  end
end
