(function ( $ ) {
    $.extend({
        draw: function() {
            var margin = 20;
            var barheight = 8, barpadding = 5, legend = 10;

            $("[data-graphit='overview']").each( function(i) {
                var q_i = i+1;
                var hits = [];
                hit_panels = $(this).find('.hitn')
                hit_panels.each (function(i) {
                    // _hsps = [$(this).data('hit-evalue')];
                    if( i >= 20 ) return false;
                    _hsps = []
                    $(this).find('.hsps').each (function(j) {
                        __hsps = []
                        __hsps = $(this).data();
                        //_hsps.push($(this).data());
                        __hsps['hspId'] = $(this).attr('id');
                        _hsps.push(__hsps);
                    });
                    _hsps['hitId'] = $(this).attr('id');
                    hits.push(_hsps);
                });
                
                // Sort according to evalues
                // hits.sort(function(a,b) { return a.hitEvalue - b.hitEvalue; });

                // DEBUG
                // console.log(hits);

                query_len = $(this).data().queryLen;
                width = $(this).width();
                height = hits.length*(barheight + barpadding) + 5*margin + legend*3;
                var graph_dom = $(this).children().eq(1).children().eq(0).after("<div class='graph'/>");

                var svg = d3.select($(this).find('.graph')[0])
                            .data([hits])
                            .append('svg')
                            .attr('width', width)
                            .attr('height', height).append('g')
                            .attr('transform', 'translate('+margin+', '+margin+')');
                // DEBUG
                // console.log(svg);

                var x = d3.scale.linear().range([0, width-margin*2])
                x.domain([0, query_len]);
                var xAxis = d3.svg.axis().scale(x).orient('top').ticks(10);

                // Attach the axis to DOM (<svg> element)
                var scale = svg.append('g')
                            .attr('transform', 'translate(0, '+margin+')')
                            .append('g').attr('class', 'x axis')
                            .call(xAxis);

                var y = d3.scale.ordinal().rangeBands([0,height-3*margin-2*legend], .5);
                y.domain(hits.map( function(d, i) { return d.hitId; } ));

                /* Kept for future.
                var color = d3.scale.linear()
                            .domain((hits.map( function(d) { return d.hitId; } )).reverse())
                            .range(["red", "yellow", "green"]);
                */
                var color2 = d3.scale.ordinal()
                                .domain((hits.map( function(d) { return d.hitId; } )))
                                .rangeBands([10,150], 0.5);

                var t = svg.append('g').attr('transform', 'translate(0, '+(2*margin-legend)+')')
                    .selectAll('.hits')
                    .data(hits)
                    .enter()
                    .append('g')//.attr('transform', function(d,i) {
                        //return 'translate(0, '+y(d.hitId)+')';
                    //})
                    .each( function(d,i) {
                        var h_i = i+1;
                        //console.log(i);
                        /*
                        var color_hsp = d3.scale.ordinal()
                                        .domain((d.map( function(d) { return d.hspId; } )))
                                        .range(["blue", "red", "green", "yellow", "orange"]);
                        */
                        //console.log(d);

                        d3.select(this)
                            .selectAll('.hsps')
                            .data(d).enter()
                            .append('a')
                        .each( function(pd, j) {
                            var p_id = d3.select(this.parentNode).datum().hitId;
                            //console.log(index);
                            //console.log(d3.select(this.parentNode).datum().hitId);

                            d3.select(this)//.append('a')
                            .attr('xlink:href', function(d,i) {return '#Query_'+(q_i)+'_hit_'+(h_i);})
                            .append('rect')
                            .attr('x', function(d) {
                                if(d.hspFrame < 0)
                                    return x(d.hspStart)+3;
                                else
                                    return x(d.hspStart);
                            })
                            .attr('y', y(p_id))
                            .attr('width', function(d) {
                                    return x(d.hspEnd - d.hspStart)-3;
                            })
                            .attr('height', barheight)
                            .attr('fill', d3.rgb(color2(p_id),color2(p_id),color2(p_id)))
                                /*function(d) {
                                //return d3.rgb(0,0,color_hsp(d.hspId));
                                return d3.rgb(0, 0, 255-y(d.hitId));
                            }) */
                            d3.select(this).append('path')
                            .attr('d', d3.svg.symbol().type('triangle-up').size(35))
                            //.attr('fill', 'green')
                            .attr('fill', d3.rgb(color2(p_id),color2(p_id),color2(p_id)))
                            .attr('transform', function(d, i) {
                                // console.log(d.hitFrame);
                                if(d.hspFrame > 0)
                                    return ('translate('+(x(d.hspEnd)+1)+', '+(y(p_id)+4)+')rotate(90)');
                                else
                                    return ('translate('+(x(d.hspStart)-1)+', '+(y(p_id)+4)+')rotate(-90)');
                            });
                        });
                    });
                //console.log(t);

                var svg_legend = svg.append('g')
                                .attr('transform', 'translate(0,'+(height-margin-legend*1.25)+')');

                svg_legend.append('rect')
                        .attr('x', 7*(width-2*margin)/10)
                        .attr('width', 2*(width-4*margin)/10)
                        .attr('height', legend)
                        .attr('fill', 'url(#legend-grad)');

                svg_legend.append('text')
                        .attr('transform', 'translate(0, '+legend+')')
                        .attr('x', 6*(width-2*margin)/10 - margin/2)
                        .text("High evalue");
                svg_legend.append('text')
                        .attr('transform', 'translate(0, '+legend+')')
                        .attr('x', 9*(width-2*margin)/10 + margin/2)
                        .text("Low evalue");

                svg.append('linearGradient')
                    .attr('id', 'legend-grad')
                  .selectAll('stop')
                    .data([
                        {offset: "0%", color: "#eee"},
                        {offset: "100%", color: "#333"}
                        ])
                  .enter().append('stop')
                    .attr('offset', function(d) { return d.offset })
                    .attr('stop-color', function(d) { return d.color });
            });
        }
    });
}( jQuery ));
