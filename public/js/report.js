import _ from 'underscore';
import React from 'react';
import d3 from 'd3';

import AlignmentsOverview from './alignmentsoverview';
import LengthDistribution from './lengthdistribution';
import AlignmentExporter from './alignment_exporter';
import AlignmentViewer from './alignment_viewer';
import Kablammo from './kablammo';
import Circos from './circos';

import * as Utils from './utils';

/**
 * Component for each hit.
 */
var Hit = React.createClass({
    // Internal helpers. //

    /**
     * Returns id that will be used for the DOM node corresponding to the hit.
     */
    domID: function () {
        return "Query_" + this.props.query.number + "_hit_" + this.props.hit.number;
    },


    // Life cycle methods //

    /**
     * Handles click event for exporting alignments.
     * Disables Sequenece viewer if hit length is greater than 10,000.
     */
    componentDidMount: function () {
        // Event-handler for exporting alignments.
        // Calls relevant method on AlignmentExporter defined in alignment_exporter.js.
        $("#" + this.domID()).find('.export-alignment').on('click',_.bind(function () {
            event.preventDefault();

            var hsps = _.map(this.props.hit.hsps, _.bind(function (hsp) {
                hsp.query_id = this.props.query.id;
                hsp.hit_id = this.props.hit.id;
                return hsp;
            }, this))

            var aln_exporter = new AlignmentExporter();
            aln_exporter.export_alignments(hsps, this.props.query.id+"_"+this.props.hit.id);
        }, this))
    },

    render: function () {
        return (
            <div
                className="hit" id={this.domID()}
                data-hit-def={this.props.hit.id} data-hit-evalue={this.props.hit.evalue}
                data-hit-len={this.props.hit.length}>
                <div
                  className="section-header">
                    <h4
                      data-toggle="collapse"
                      data-target={ "#Query_" + this.props.query.number + "_hit_"
                                     + this.props.hit.number + "_alignment"} >
                        <i className="fa fa-chevron-down"></i>
                        &nbsp;
                        <span>
                            {this.props.hit.id}
                            &nbsp;
                            <small>
                                {this.props.hit.title}
                            </small>
                        </span>
                    </h4>
                    <span
                      className="label label-reset pos-label"
                      title={"Query " + this.props.query.number + ". Hit "
                              + this.props.hit.number + " of "
                              + this.props.query.hits.length + "."}
                      data-toggle="tooltip">
                      {this.props.hit.number + "/" + this.props.query.hits.length}
                    </span>
                </div>
                <div
                    className="section-content collapse in"
                    id={"Query_" + this.props.query.number + "_hit_"
                        + this.props.hit.number + "_alignment"}>
                    <div
                        className="hit-links">
                        <label>
                            <input
                                type="checkbox" id={this.domID() + "_checkbox"}
                                value={this.props.hit.id}
                                data-target={"#Query_" + this.props.query.number
                                             + "_hit_" + this.props.hit.number}
                                onChange=
                                {
                                    _.bind(function () {
                                        this.props.selectHit(this.domID() + "_checkbox");
                                    }, this)
                                }
                            />
                            <span>{" Select "}</span>
                            {
                                _.map(this.props.hit.links, _.bind(function (link) {
                                    return [<span> | </span>, Utils.a(link)];
                                }, this))
                            }
                        </label>
                    </div>
                    <Kablammo key={"Kablammo"+this.props.query.id}
                        query={this.props.query} hit={this.props.hit}
                        algorithm={this.props.algorithm}/>
                    <div className="hsps">
                        {
                            _.map(this.props.hit.hsps, _.bind(function (hsp) {
                                return (
                                    <div
                                        id={"Query_" + this.props.query.number +
                                            "_hit_" + this.props.hit.number + "_"
                                            + hsp.number}
                                        key={"Query_" + this.props.query.id +
                                            "_Hit_" + this.props.hit.id + "_"
                                            + hsp.number}
                                        className="hsp">
                                        <AlignmentViewer hsp={hsp}
                                            algorithm={this.props.algorithm}/>
                                    </div>
                                );
                          }, this))
                      }
                    </div>
                </div>
            </div>
        );
    }
});

/**
 * Renders summary of all hits per query in a tabular form.
 */
var HitsTable = React.createClass({
    render: function () {
        var count = 0,
          hasName = _.every(this.props.query.hits, function(hit) {
            return hit.sciname !== '';
          });

        return (
            <table
                className="table table-hover table-condensed tabular-view">
                <thead>
                    <th className="text-left">#</th>
                    <th>Similar sequences</th>
                    {hasName && <th className="text-left">Species</th>}
                    <th className="text-right">Query coverage</th>
                    <th className="text-right">Total Score</th>
                    <th className="text-right">E value</th>
                    <th className="text-right">Identity</th>
                </thead>
                <tbody>
                    {
                        _.map(this.props.query.hits, _.bind(function (hit) {
                            return (
                                <tr key={hit.id}>
                                    <td className="text-left">{hit.number + "."}</td>
                                    <td>
                                        <a href={"#Query_" + this.props.query.number + "_hit_" + hit.number}>
                                            {hit.id}
                                        </a>
                                    </td>
                                    {hasName && <td className="text-left">{this.prettify(hit.sciname)}</td>}
                                    <td className="text-right">{Utils.prettify(hit.qcovs)}</td>
                                    <td className="text-right">{Utils.prettify(hit.score)}</td>
                                    <td className="text-right">{Utils.prettify(hit.hsps[0].evalue)}</td>
                                    <td className="text-right">{Utils.prettify(hit.hsps[0].identity)}</td>
                                </tr>
                            )
                        }, this))
                    }
                </tbody>
            </table>
        );
    }
});

/**
 * Renders report for each query sequence.
 *
 * Composed of graphical overview, tabular summary (HitsTable),
 * and a list of Hits.
 */
var Query = React.createClass({

    // Kind of public API //

    /**
     * Returns the id of query.
     */
    domID: function () {
        return "Query_" + this.props.query.number;
    },

    /**
     * Returns number of hits.
     */
    numhits: function () {
        return this.props.query.hits.length;
    },

    // Life cycle methods //

    render: function () {
        return (
            <div
                className="resultn" id={this.domID()}
                data-query-len={this.props.query.length}
                data-algorithm={this.props.data.program}>
                <div
                    className="section-header">
                    <h3>
                        Query= {this.props.query.id}
                        &nbsp;
                        <small>
                            {this.props.query.title}
                        </small>
                    </h3>
                    <span
                        className="label label-reset pos-label"
                        title={"Query" + this.props.query.number + "."}
                        data-toggle="tooltip">
                        {this.props.query.number + "/" + this.props.data.queries.length}
                    </span>
                </div>
                {this.numhits() &&
                    (
                        <div
                            className="section-content">

                            <AlignmentsOverview key={"GO_"+this.props.query.id} query={this.props.query} program={this.props.data.program}/>
                            <LengthDistribution key={"LD_"+this.props.query.id} query={this.props.query} algorithm={this.props.data.program}/>
                            <HitsTable key={"HT_"+this.props.query.id} query={this.props.query}/>
                            <div id="hits">
                                {
                                    _.map(this.props.query.hits, _.bind(function (hit) {
                                        return (
                                            <Hit
                                                hit={hit}
                                                key={"HIT_"+hit.id}
                                                algorithm={this.props.data.program}
                                                query={this.props.query}
                                                selectHit={this.props.selectHit}/>
                                        );
                                    }, this))
                                }
                            </div>
                        </div>
                    ) || (
                        <div
                            className="section-content">
                            <p>
                                Query length: {this.props.query.length}
                            </p>
                            <br/>
                            <br/>
                            <p>
                                <strong> ****** No hits found ****** </strong>
                            </p>
                        </div>
                    )
                }
            </div>
        )
    },
});


/**
 * Renders links for downloading hit information in different formats.
 * Renders links for navigating to each query.
 */
var SideBar = React.createClass({

    /**
     * Dynamically create form and submit.
     */
    postForm: function (sequence_ids, database_ids) {
        var form = $('<form/>').attr('method', 'post').attr('action', '/get_sequence');
        addField("sequence_ids", sequence_ids);
        addField("database_ids", database_ids);
        form.appendTo('body').submit().remove();

        function addField(name, val) {
            form.append(
                $('<input>').attr('type', 'hidden').attr('name', name).val(val)
            );
        }
    },

    /**
     * Event-handler for downloading fasta of all hits.
     */
    downloadFastaOfAll: function () {
        var sequence_ids = $('.hit-links :checkbox').map(function () {
            return this.value;
        }).get();
        var database_ids = _.map(this.props.data.querydb, _.iteratee('id'));
        this.postForm(sequence_ids, database_ids);
    },

    /**
     * Handles downloading fasta of selected hits.
     */
    downloadFastaOfSelected: function () {
        var sequence_ids = $('.hit-links :checkbox:checked').map(function () {
            return this.value;
        }).get();
        var database_ids = _.map(this.props.data.querydb, _.iteratee('id'));
        this.postForm(sequence_ids, database_ids);
    },

    downloadAlignmentOfAll: function() {
        var sequence_ids = $('.hit-links :checkbox').map(function () {
            return this.value;
        }).get();
        var hsps_arr = [];
        var aln_exporter = new AlignmentExporter();
        _.each(this.props.data.queries, _.bind(function (query) {
            _.each(query.hits, function (hit) {
                _.each(hit.hsps, function (hsp) {
                    hsp.hit_id = hit.id;
                    hsp.query_id = query.id;
                    hsps_arr.push(hsp);
                })
            })
        }, this));
        console.log('len '+hsps_arr.length);
        aln_exporter.export_alignments(hsps_arr, "alignment-"+sequence_ids.length+"_hits");
    },

    downloadAlignmentOfSelected: function () {
        var sequence_ids = $('.hit-links :checkbox:checked').map(function () {
            return this.value;
        }).get();
        var hsps_arr = [];
        var aln_exporter = new AlignmentExporter();
        console.log('check '+sequence_ids.toString());
        _.each(this.props.data.queries, _.bind(function (query) {
            _.each(query.hits, function (hit) {
                if (_.indexOf(sequence_ids, hit.id) != -1) {
                    _.each(hit.hsps, function (hsp) {
                        hsp.hit_id = hit.id;
                        hsp.query_id = query.id;
                        hsps_arr.push(hsp);
                    });
                }
            });
        }, this));
        aln_exporter.export_alignments(hsps_arr, "alignment-"+sequence_ids.length+"_hits");
    },

    summary: function () {
        var program = this.props.data.program;
        var numqueries = this.props.data.queries.length;
        var numquerydb = this.props.data.querydb.length;

        return (
            program.toUpperCase() + ': ' +
            numqueries + ' ' + (numqueries > 1 ? 'queries' : 'query') + ", " +
            numquerydb + ' ' + (numquerydb > 1 ? 'databases' : 'database')
        );
    },

    // Life-cycle method. //
    render: function () {
        return (
            <div
                className="sidebar">
                <div
                  className="section-header">
                  <h4>
                      { this.summary() }
                  </h4>
                </div>
                <ul
                    className="nav hover-reset active-bold index">
                    {
                        _.map(this.props.data.queries, _.bind(function (query) {
                            return (
                                <li key={"Side_bar_"+query.id}>
                                    <a
                                        className="nowrap-ellipsis hover-bold"
                                        href={"#Query_" + query.number}
                                        title={"Query= " + query.id + ' ' + query.title}>
                                        {"Query= " + query.id}
                                    </a>
                                </li>
                            );
                        }, this))
                    }
                </ul>

                <br/>
                <br/>

                <div
                  className="section-header">
                    <h4>
                        Download FASTA, XML, TSV
                    </h4>
                </div>
                <ul
                  className="downloads list-unstyled list-padded">
                    <li>
                        <a
                          className="download-fasta-of-all"
                          onClick={this.downloadFastaOfAll}>
                            FASTA of all hits
                        </a>
                    </li>
                    <li>
                        <a
                          className="download-fasta-of-selected disabled"
                          onClick={this.downloadFastaOfSelected}>
                            FASTA of <span className="text-bold"></span> selected hit(s)
                        </a>
                    </li>
                    <li>
                        <a
                          className="download-alignment-of-all"
                          onClick={this.downloadAlignmentOfAll}>
                          Alignment of all hits
                        </a>
                    </li>
                    <li>
                        <a
                          className="download-alignment-of-selected disabled"
                          onClick={this.downloadAlignmentOfSelected}>
                          Alignment of <span className="text-bold"></span> selected hit(s)
                        </a>
                    </li>
                    <li>
                        <a
                          className="download" data-toggle="tooltip"
                          title="15 columns: query and subject ID; scientific
                          name, alignment length, mismatches, gaps, identity,
                          start and end coordinates, e value, bitscore, query
                          coverage per subject and per HSP."
                          href={"download/" + this.props.data.search_id + ".std_tsv"}>
                            Standard tabular report
                        </a>
                    </li>
                    <li>
                        <a
                          className="download" data-toggle="tooltip"
                          title="44 columns: query and subject ID, GI,
                          accessions, and length; alignment details;
                          taxonomy details of subject sequence(s) and
                          query coverage per subject and per HSP."
                          href={"download/" + this.props.data.search_id + ".full_tsv"}>
                            Full tabular report
                        </a>
                    </li>
                    <li>
                        <a
                          className="download" data-toggle="tooltip"
                          title="Results in XML format."
                          href={"download/" + this.props.data.search_id + ".xml"}>
                            Full XML report
                        </a>
                    </li>
                </ul>
            </div>
        )
    }
});

/**
 * Renders entire report.
 *
 * Composed of Query and Sidebar components.
 */
var Report = React.createClass({

    // Kind of public API //

    /**
     * Event-handler when hit is selected
     * Adds glow to hit component.
     * Updates number of Fasta that can be downloaded
     */
    selectHit: function (id) {

        var checkbox = $("#" + id);
        var num_checked  = $('.hit-links :checkbox:checked').length;

        if (!checkbox || !checkbox.val()) {
            return;
        }

        var $hit = $(checkbox.data('target'));

        // Highlight selected hit and sync checkboxes if sequence viewer is open.
        if (checkbox.is(":checked")) {
            $hit
            .addClass('glow')
            .find(":checkbox").not(checkbox).check();
            var $a = $('.download-fasta-of-selected');
            var $b = $('.download-alignment-of-selected');
            $b.enable()
            var $n = $a.find('span');
            $a
            .enable()
        }

        else {
            $hit
            .removeClass('glow')
            .find(":checkbox").not(checkbox).uncheck();
        }

        if (num_checked >= 1)
        {
            var $a = $('.download-fasta-of-selected');
            var $b = $('.download-alignment-of-selected');
            $a.find('.text-bold').html(num_checked);
            $b.find('.text-bold').html(num_checked);
        }

        if (num_checked == 0) {
            var $a = $('.download-fasta-of-selected');
            var $b = $('.download-alignment-of-selected');
            $a.addClass('disabled').find('.text-bold').html('');
            $b.addClass('disabled').find('.text-bold').html('');
        }
    },


    // Internal helpers. //

    /**
     * Fetch results.
     */
    fetch_results: function () {
        $.getJSON(location.pathname + '.json')
        .complete(_.bind(function (jqXHR) {
            switch (jqXHR.status) {
            case 202:
                setTimeout(fetch_results, 5000);
                break;
            case 200:
                this.setState(jqXHR.responseJSON);
                break;
            case 500:
                SequenceServer.showErrorModal(jqXHR, function () {});
                break;
            }
        }, this));
    },

    /**
     * Returns true if results have been fetched.
     *
     * A holding message is shown till results are fetched.
     */
    isResultAvailable: function () {
        return this.state.queries.length >= 1;
    },

    /**
     * Returns true if sidebar should be shown.
     *
     * Sidebar is not shown if there is only one query and there are no hits
     * corresponding to the query.
     */
    shouldShowSidebar: function () {
        return !(this.state.queries.length == 1 &&
                 this.state.queries[0].hits.length == 0);
    },

    loading: function () {
        return (
            <div
                className="row">
                <div
                    className="col-md-6 col-md-offset-3 text-center">
                    <h1>
                        <i
                            className="fa fa-cog fa-spin"></i>
                        BLAST-ing
                    </h1>
                    <p>
                        <br/>
                        This can take some time depending on the size of your query and
                        database(s). The page will update automatically when BLAST is
                        done.
                        <br/>
                        <br/>
                        You can bookmark the page and come back to it later or share
                        the link with someone.
                    </p>
                </div>
            </div>
        );
    },

    /**
     * Renders report overview.
     */
    overview: function () {
        return (
            <div
                className="overview">
                <pre
                    className="pre-reset">
                    {this.state.program_version}
                    <br/>
                    <br/>
                    {
                        _.map(this.state.querydb, function (db) {
                            return db.title;
                        }).join(", ")
                    }
                    <br/>
                    Total: {this.state.stats.nsequences} sequences, {this.state
                        .stats.ncharacters} characters
                    <br/>
                    <br/>
                    {
                        _.map(this.state.params, function (val, key) {
                            return key + " " + val;
                        }).join(", ")
                    }
                </pre>
            </div>
        );
    },

    /**
     * Renders results per query.
     */
    results: function () {
        return (
            <div className="row">
                { this.shouldShowSidebar() &&
                    (
                        <div
                            className="col-md-3 hidden-sm">
                            <SideBar data={this.state}/>
                        </div>
                    )
                }
                <div className={this.shouldShowSidebar() ?
                    'col-md-9' : 'col-md-12'}>
                    { this.overview() }
                    <Circos queries={this.state.queries}
                        program={this.state.program}/>
                    {
                        _.map(this.state.queries, _.bind(function (query) {
                            return (
                                <Query key={"Query_"+query.id} query={query} data={this.state}
                                    selectHit={this.selectHit}/>
                                );
                        }, this))
                    }
                </div>
            </div>
        );
    },

    /**
     * Affixes the sidebar.
     *
     * TODO: can't this be done with CSS?
     */
    affixSidebar: function () {
        var $sidebar = $('.sidebar');
        $sidebar.affix({
            offset: {
                top: $sidebar.offset().top
            }
        });
    },

    /**
     * For the query in viewport, highlights corresponding entry in the index.
     */
    setupScrollSpy: function () {
        $('body').scrollspy({target: '.sidebar'});
    },

    /**
     * Prevents folding of hits during text-selection.
     */
    setupHitSelection: function () {
        $('body').on('mousedown', ".hit > .section-header > h4", function (event) {
            var $this = $(this);
            $this.on('mouseup mousemove', function handler(event) {
                if (event.type === 'mouseup') {
                    // user wants to toggle
                    $this.attr('data-toggle', 'collapse');
                    $this.find('.fa-chevron-down').toggleClass('fa-rotate-270');
                } else {
                    // user wants to select
                    $this.attr('data-toggle', '');
                }
                $this.off('mouseup mousemove', handler);
            });
        });
    },

    // Download links.
    //
    // Handles downloading files referenced by links with class 'download'.
    setupDownloadLinks: function () {
        $(document).on('click', '.download', function (event) {
            event.preventDefault();
            event.stopPropagation();

            var $anchor = $(this);

            if ($anchor.is(':disabled')) return;

            var url = $anchor.attr('href');

            $.get(url)
            .done(function (data) {
                window.location.href = url;
            })
            .fail(function (jqXHR, status, error) {
                SequenceServer.showErrorModal(jqXHR, function () {});
            });
        });
    },

    // Life-cycle methods. //

    getInitialState: function () {
        return {
            search_id:       '',
            program:         '',
            program_version: '',
            queries:         [],
            querydb:         [],
            params:          [],
            stats:           []
        };
    },

    render: function () {
        return (this.isResultAvailable() && this.results() || this.loading());
    },

    componentDidMount: function () {
        this.fetch_results();
    },

    /**
     * Locks Sidebar in its position.
     * Prevents folding of hits during text-selection
     */
    componentDidUpdate: function () {
        this.affixSidebar();
        this.setupScrollSpy();
        this.setupHitSelection();
        this.setupDownloadLinks();
    }
});

var Page = React.createClass({
    render: function () {
        return (
            <div>
                <div
                    className="container">
                    <Report ref="report"/>
                </div>

                <div
                    id="sequence-viewer" className="modal"
                    tabIndex="-1">
                </div>

                <div
                  id='circos-demo' className='modal'>
                </div>

                <canvas
                    id="png-exporter" hidden>
                </canvas>
            </div>
        );
    }
});

export {Page};
