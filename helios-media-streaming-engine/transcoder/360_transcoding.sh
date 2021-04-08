#!/bin/sh

/usr/local/bin/ffmpeg -i rtmp://localhost:1935/$1/$2 -r 30 \
    -filter_complex "[v:0]split=2[a][b];[a]scale=1280:trunc(ow/a/2)*2[oa];[b]copy[ob]" \
    -c:v libx264 -preset superfast -g 60 -sc_threshold 0 \
    -map [oa] -c:v:0 libx264 -b:v:0 2000k \
    -map [ob] -c:v:1 libx264 -b:v:1 10000k \
    -map a:0 -c:a aac -b:a 128k -ac 2 \
    -f hls -hls_time 6 -hls_list_size 10 -master_pl_name $2.m3u8 -hls_flags delete_segments+independent_segments \
    -var_stream_map "v:0,a:0 v:1,a:0" /opt/data/hls/$2_%v.m3u8 \
    2> /opt/data/logs/$2.txt

