#!/usr/bin/env ruby

require 'shellwords'

IO.readlines('.env').each{|var|
  puts "heroku config:set #{var.strip.shellescape}"
}
