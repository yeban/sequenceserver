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

    ## When not commented out, this method is used to take a
    ## sequence ID, and return a hyperlink that
    ## replaces the hit in the BLAST output.
    ##
    ## Return the hyperlink to link to, or nil
    ## to not not include a hyperlink.
    ##
    ## When this method
    ## is commented out, the default link is used. The default
    ## is a link to the full sequence of
    ## the hit is displayed (if makeblastdb has been run with
    ## -parse_seqids), or no link at all otherwise.
    # def construct_custom_sequence_hyperlink(options)
    #   ## Example:
    #   ## sequence_id comes in like "psu|MAL13P1.200 | organism=Plasmodium_falciparum_3D7 | product=mitochondrial"
    #   ## output: "http://apiloc.bio21.unimelb.edu.au/apiloc/gene/MAL13P1.200"
    #   matches = options[:sequence_id].match(/^\s*psu\|(\S+) /)
    #   if matches #if the sequence_id conforms to our expectations
    #     # All is good. Return the hyperlink.
    #     return "http://apiloc.bio21.unimelb.edu.au/apiloc/gene/#{matches[1]}"
    #   else
    #     # Parsing the sequence_id didn't work. Don't include a hyperlink for this
    #     # sequence_id, but log that there has been a problem.
    #     settings.log.warn "Unable to parse sequence id `#{options[:sequence_id]}'"
    #     # Return nil so no hyperlink is generated.
    #     return nil
    #   end
    # end

    # Hook into SequenceServer's BLAST result formatting process to insert
    # links to Hymenopterabase Genome Browser, and/or Uniprot page
    # corresponding to a 'hit'.
    def construct_custom_sequence_hyperlinking_line(options)
      line = "><a href='#{url(default_link(options))}'>#{options[:sequence_id]}</a>"
      case options[:sequence_id]
      when /^lcl\|(PB.*-RA) /
        # pbar cds and protein
        id = $1
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/pbarbatus_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|pbar_(scf\d*) /
        # pbar genomic
        id = $1
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
        id = $1
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/sinvicta_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|(LH\d*-RA) /
        # lhum cds and protein
        id = $1
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/lhumile_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|(scf\d*) /
        # lhum genomic
        id = $1
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
        id = $1
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/cfloridanus_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Hsal_(\d*)--/
        # hsal cds and protein
        id = "HSAL#{$1}-RA"
        browser = "http://genomes.arc.georgetown.edu/cgi-bin/gbrowse/hsaltator_1/?name=#{id}"
        line << " [<a href='#{browser}'>Genome Browser</a>]\n"
      when /^lcl\|Hsal_gn3.3_((scaffold\d*)|(C\d*)) /
        # hsal genomic
        id = $1
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
