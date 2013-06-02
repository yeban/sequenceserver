# ensure 'lib/' is in the load path
require File.join(File.dirname(__FILE__), 'lib', 'sequenceserver')

app = SequenceServer::App.new(File.expand_path('~/.sequenceserver.conf'))
run app
