require 'sequenceserver'
require 'sequenceserver/sequence'
require 'digest/md5'
require 'rspec'

def assert_equal(expected, observed, message=nil)
  observed.should == expected
end

module SequenceServer

  describe 'Sequence' do

    let 'root' do
      SequenceServer.root
    end

    let 'database_dir_funky' do
      File.join(root, 'spec', 'database', 'funky_ids', 'funky_ids.fa')
    end

    it 'test_guess_sequence_type_nucleotide' do
      #must 'correctly detect nucleotide sequence, even when it includes crap' do
      ['AAAAAAAAAAAAAAAAAAAAAT',
       '           CAGATGCRRCAAAGCAAACGGCAA 34523453 652352',
       'ACCNNNNNNXXXXCAUUUUUU',
       "ACGT\n\t\t\nACCACGGACCACGAAAGCG"].each do |seq|
         assert_equal(:nucleotide, Sequence.guess_type(seq), message="for #{seq}")
       end
    end

    it 'test_guess_sequence_type_aminoacid' do
      #must 'correctly detect aminoacid sequence, even when it includes a lot of crap' do
      ['ADSACGHKSJLFCVMGTL',
       '  345   KSSYPHYSPPPPHS      345 23453 652352',
       'GEYSNLNNNNNNXXXXSSSSSSSSSSSSSSSSSSSSSSS',
       "EE\n\t\t\n         \t\t\EEQRRQQSARTSRRQR"     ].each do |seq|
         assert_equal(:protein, Sequence.guess_type(seq) , message="for #{seq}")
       end
    end

    it 'test_guess_sequence_type_impossible' do
      assert_equal(nil, Sequence.guess_type('ACSFGT'), message='too little sequence')
    end

    it 'test_composition' do
      expected_comp = {"a"=>2, "d"=>3, "f"=>7, "s"=>3, "A"=>1}
      assert_equal(expected_comp, Sequence.composition('asdfasdfffffAsdf'))
    end

    it 'should be correctly retrieved from database if only numerals are present' do
      Database.scan_databases_dir
      funky_db_hex = Digest::MD5.hexdigest database_dir_funky
      funky_sequences = ['123#456', '123456', '123456#']
      Sequence.from_blastdb(funky_sequences, funky_db_hex).should_not be_empty
    end
  end
end
