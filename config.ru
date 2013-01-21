require 'rubygems'
require 'bundler/setup'
require 'sequenceserver'

app = SequenceServer::App.new(File.expand_path('~/.sequenceserver.conf'))
run app
