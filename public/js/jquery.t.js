(function ($) {
    $.extend({
        initialize: function (selector) {
            var selectorId = $(selector).attr('id');
            var graphDOM = $(selector).children().eq(1).children()
                .eq(0).after("<div class='graph'/>");
            $(selector).children().eq(1).children().eq(1)
                .after("<button type='button' data-parent-query="+ selectorId +
                    " class='more btn btn-link btn-xs'> Load more .. </button>");
        },

        toD3: function (selector, index, howMany) {
            var hits = []
            hitPanels = $(selector).find('.hitn').slice(0, index + howMany);
            hitPanels.map(function () {
                _hsps = [];
                $(this).find('.hsps').each(function () {
                    __hsps = [];
                    __hsps = $(this).data();
                    __hsps.hspId = $(this).attr('id');
                    _hsps.push(__hsps);
                });
                _hsps.hitId = $(this).attr('id');
                _hsps.hitDef = $(this).data().hitDef;
                _hsps.hitEvalue = $(this).data().hitEvalue;
                hits.push(_hsps);
            });
            return hits;
        },

        graphIt: function (selector, index, howMany, opts) {
            var defaults = {
                barHeight: 4,
                barPadding: 5,
                legend: 10,
                margin: 20
            }, options = $.extend(defaults, opts),
               hits = $.toD3(selector, index, howMany);

            if (hits < 1) return false;

            if (index == 0) {
                $.initialize(selector);
            }
            else {
                d3.select($(selector).find('.graph')[0])
                .selectAll('svg')
                .remove();
            }

            var queryLen = $(selector).data().queryLen;
            var q_i = $(selector).attr('id');

            var width = $('.graph', selector).width();
            var height = hits.length*(options.barHeight + options.barPadding) 
                + 5*options.margin + options.legend*3;

            var svg = d3.select($(selector).find('.graph')[0])
                .selectAll('svg')
                .data([hits]).enter()
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate('+options.margin/4+', '+options.margin/4+')');

            var x = d3.scale.linear().range([0, width-options.margin])
            x.domain([1, queryLen]);

            var _tValues = x.ticks(11);
            _tValues.pop();

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('top')
                .tickValues(_tValues.concat([1, queryLen]));

            // Attach the axis to DOM (<svg> element)
            var scale = svg.append('g')
                        .attr('transform', 'translate(0, '+options.margin+')')
                        .append('g').attr('class', 'x axis')
                        .call(xAxis);

            var y = d3.scale.ordinal()
                .rangeBands([0,height-3*options.margin-2*options.legend], .3);

            y.domain(hits.map(function (d, i) {
                return d.hitId; 
            }));

            var gradScale = d3.scale.log()
                .domain([d3.min([1e-5, d3.min(hits.map(function (d) {
                    return d.hitEvalue;
                }))]), d3.max(hits.map(function (d) {
                    return d.hitEvalue;
                }))])
                .range([40,150]);

            /*
            var color = d3.scale.ordinal()
                .domain((hits.map(function (d) { return d.id; })))
                .rangeBands([10,150], 0.5);
            */

            svg.append('g')
                .attr('class', 'ghit')
                .attr('transform', 'translate(0, '+(2*options.margin-options.legend)+')')
                .selectAll('.hits')
                .data(hits)
                .enter()
                .append('g')
                .attr('data-toggle', 'tooltip')
                .attr('title', function(d) {
                    var regex = /(\d*\.\d*)e?([+-]\d*)?/;
                    var parsedVal = regex.exec(d.hitEvalue);
                    var prettyEvalue = +parseFloat(parsedVal[1]).toFixed(3)
                    var returnString = d.hitDef + '<br><strong>Evalue:</strong> ' + prettyEvalue;
                    if (parsedVal[2] != undefined) {
                        returnString +=  ' x 10<sup>' + parsedVal[2] + '</sup>';
                    }
                    return returnString;
                })
                .each(function (d,i) {
                    var h_i = i+1;
                    var p_hsp = d;
                    var p_id = d.hitId;
                    var p_count = d.length;

                    d3.select(this)
                        .selectAll('.hsps')
                        .data(d).enter()
                        .append('a')
                        .each(function (pd, j) {
                            var y_hspline = y(p_id)+options.barHeight/2;
                            var hspline_color = d3.rgb(gradScale(p_hsp.hitEvalue),
                                gradScale(p_hsp.hitEvalue),gradScale(p_hsp.hitEvalue));

                            if (j+1 < p_count) {
                                if (p_hsp[j].hspEnd < p_hsp[j+1].hspStart) {
                                    d3.select(this.parentNode).append('line')
                                        .attr('x1', x(p_hsp[j].hspEnd))
                                        .attr('y1', y_hspline)
                                        .attr('x2', x(p_hsp[j+1].hspStart))
                                        .attr('y2', y_hspline)
                                        .attr('stroke', hspline_color);
                                }
                                else if (p_hsp[j].hspStart > p_hsp[j+1].hspEnd) {
                                    d3.select(this.parentNode).append('line')
                                        .attr('x1', x(p_hsp[j+1].hspEnd))
                                        .attr('y1', y_hspline)
                                        .attr('x2', x(p_hsp[j].hspStart))
                                    .attr('y2', y_hspline)
                                    .attr('stroke', hspline_color);
                            };
                        };

                        d3.select(this)
                        .attr('xlink:href', function (d,i) {return '#'+q_i+'_hit_'+(h_i);})
                        .append('rect')
                        .attr('x', function (d) {
                            if (d.hspFrame < 0)
                                return x(d.hspStart);
                            else
                                return x(d.hspStart);
                        })
                        .attr('y', y(p_id))
                        .attr('width', function (d) {
                                return x(d.hspEnd - d.hspStart);
                        })
                        .attr('height', options.barHeight)
                        .attr('fill', d3.rgb(hspline_color));
                    });
                });

                var svg_legend = svg.append('g')
                        .attr('transform', 
                            'translate(0,'+(height-options.margin-options.legend*1.25)+')');

                svg_legend.append('rect')
                        .attr('x', 7*(width-2*options.margin)/10)
                        .attr('width', 2*(width-4*options.margin)/10)
                        .attr('height', options.legend)
                        .attr('fill', 'url(#legend-grad)');

                svg_legend.append('text')
                        .attr('transform', 'translate(0, '+options.legend+')')
                        .attr('x', 6*(width-2*options.margin)/10 - options.margin/2)
                        .text("Weaker hits");
                svg_legend.append('text')
                        .attr('transform', 'translate(0, '+options.legend+')')
                        .attr('x', 9*(width-2*options.margin)/10 + options.margin/2)
                        .text("Stronger hits");

                svg.append('linearGradient')
                    .attr('id', 'legend-grad')
                  .selectAll('stop')
                    .data([
                        {offset: "0%", color: "#ccc"},
                        {offset: '50%', color: '#888'},
                        {offset: "100%", color: "#000"}
                        ])
                  .enter().append('stop')
                    .attr('offset', function (d) { return d.offset })
                    .attr('stop-color', function (d) { return d.color });
        } 
    });
}(jQuery));
