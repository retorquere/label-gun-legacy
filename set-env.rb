#!/usr/bin/env ruby

require 'shellwords'

cmd = 'heroku config:set'
#cmd = 'echo'

IO.readlines('.env').each{|var|
  next if var =~ /^#/
  next if var =~ /^WEBHOOK_PROXY_URL/
  next if var.strip == ''
  puts "#{cmd} #{var.strip.shellescape}"
}

puts "#{cmd} PRIVATE_KEY=\"$(cat *private-key.pem)\""
