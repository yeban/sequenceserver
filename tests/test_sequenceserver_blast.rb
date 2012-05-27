require 'sequenceserver'
require 'minitest/spec'
require 'minitest/autorun'
require 'rack/test'

ENV['RACK_ENV'] = 'test'

module SequenceServer
  describe "App" do
    include Rack::Test::Methods

    def app
      App
    end

    def setup
      @params = {'method' => 'blastn', 'sequence' => 'AGCTAGCTAGCT', 'databases' => ['123']}
    end

    it 'returns Bad Request (400) if no blast method is provided' do
      @params.delete('method')
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if no input sequence is provided' do
      @params.delete('sequence')
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if no database id is provided' do
      @params.delete('databases')
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if an empty database list is provided' do
      @params['databases'].pop

      # ensure the list of databases is empty
      @params['databases'].length.must_equal 0

      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if an incorrect blast method is supplied' do
      @params['method'] = 'foo'
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if advanced params is not a YAML map' do
      @params['advanced'] = '-word_size 5; rm -rf /'
      post '/', @params
      last_response.status.must_equal 400

      @params['advanced'] = 'word_size: 5, foo: bar'
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if an unknown advanced param is specified' do
      @params['advanced'] = '{word_size: 5, foo: bar}'
      post '/', @params
      last_response.status.must_equal 400

      @params['advanced'] = '{word_size: 5, foo}'
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if incompatible advanced params are specified' do
      @params['advanced'] = '{subject_loc: a, gilist: b}'
      post '/', @params
      last_response.status.must_equal 400
    end

    it 'returns Bad Request (400) if dependency for a dependend option is not specified' do
      @params['advanced'] = '{entrez_query: a, gilist: b}'
      post '/', @params
      last_response.status.must_equal 400
    end
  end
end
