require 'sequenceserver/clioptions'
require 'minitest/spec'
require 'minitest/autorun'

module SequenceServer
  describe "CLIOptions" do
    it "should not accept incompatible options - 1" do
      valid, message = CLIOptions.validate('{culling_limit: 1, best_hit_overhang: 0.2}')
      valid.must_equal false
    end

    it "should not accept incompatible options - 2" do
      valid, message = CLIOptions.validate('{subject_loc: ab, gilist: 1234}')
      valid.must_equal false
    end

    it "should not accept missing dependencies" do
      valid, message = CLIOptions.validate('{entrez_query: ab}')
      valid.must_equal false

      valid, message = CLIOptions.validate('{entrez_query: ab, remote}')
      valid.must_equal true
    end

    it "should not accept banned options" do
      banned = %w|h help version query db out subject outfmt html import_search_strategy export_search_strategy|
      banned.each do |o|
        valid, message = CLIOptions.validate("{#{o}}")
        valid.must_equal false
      end
    end
  end
end
