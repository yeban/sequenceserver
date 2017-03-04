import React from 'react';
import _ from 'underscore';

import * as Utils from './utils'
import * as Helpers from './visualisation_helpers';

/**
 * Alignment viewer.
 */
export default class AlignmentViewer extends React.Component {

    constructor(props) {
        super(props);
        this.hsp = props.hsp;
    }

    // Renders pretty formatted alignment.
    render () {
        var chars = 60 // TODO: dynamic
        var lines = Math.ceil(this.hsp.length / chars)
        var width = _.max(_.map([this.hsp.qstart, this.hsp.qend,
                                this.hsp.sstart, this.hsp.send],
                                (n) => { return n.toString().length }));
        var lcoords = [];
        var rcoords = [];
        var alnmnts = [];

        var nqseq = this.nqseq();
        var nsseq = this.nsseq();

        for (let i = 1; i <= lines; i++) {
            let seq_start_index = chars * (i - 1);
            let seq_stop_index = seq_start_index + chars;

            let lqstart = nqseq;
            let lqseq = this.hsp.qseq.slice(seq_start_index, seq_stop_index);
            let lqend = nqseq + (lqseq.length - lqseq.split('-').length) *
                this.qframe_unit() * this.qframe_sign();
            nqseq = lqend + this.qframe_unit() * this.qframe_sign();

            lcoords.push('Query ' + this.formatCoords(lqstart, width) + ' ');
            lcoords.push((<br/>));
            alnmnts = alnmnts.concat(this.formatSeq(lqseq));
            rcoords.push(' ' + lqend);
            rcoords.push((<br/>));

            var lmseq = this.hsp.midline.slice(seq_start_index, seq_stop_index);
            lcoords.push((<br/>));
            alnmnts = alnmnts.concat(this.formatSeq(lmseq));
            rcoords.push((<br/>));

            let lsstart = nsseq;
            let lsseq = this.hsp.sseq.slice(seq_start_index, seq_stop_index);
            let lsend = nsseq + (lsseq.length - lsseq.split('-').length) *
                this.sframe_unit() * this.sframe_sign();
            nsseq = lsend + this.sframe_unit() * this.sframe_sign();

            lcoords.push('Sbjct ' + this.formatCoords(lsstart, width) + ' ');
            lcoords.push((<br/>));
            alnmnts = alnmnts.concat(this.formatSeq(lsseq));
            rcoords.push(' ' + lsend);
            rcoords.push((<br/>));

            if (i !== lines) {
                lcoords.push((<br/>));
                alnmnts.push((<br/>));
                rcoords.push((<br/>));
            }
        }

        return (
            <div className="viewer">
                <pre className="pre-reset header">
                    {
                        Helpers.toLetters(this.hsp.number) + "."
                    }
                    &nbsp;
                    {
                        _.map(this.getStats(this.hsp), function (value , key) {
                            return key + ' ' + value;
                        }).join(', ')
                    }
                </pre>
                <pre className="pre-reset coords">
                    {lcoords}
                </pre>
                <pre className="pre-reset alnmnt">
                    {alnmnts}
                </pre>
                <pre className="pre-reset coords">
                    {rcoords}
                </pre>
            </div>
        );
    }

    // Alignment start coordinate for query sequence.
    //
    // This will be qstart or qend depending on the direction in which the
    // (translated) query sequence aligned.
    nqseq () {
        switch (this.props.algorithm) {
            case 'blastp':
            case 'blastx':
            case 'tblastn':
            case 'tblastx':
                return this.hsp.qframe >= 0 ? this.hsp.qstart : this.hsp.qend;
            case 'blastn':
                // BLASTN is a bit weird in that, no matter which direction the query
                // sequence aligned in, qstart is taken as alignment start coordinate
                // for query.
                return this.hsp.qstart;
        }
    }

    // Alignment start coordinate for subject sequence.
    //
    // This will be sstart or send depending on the direction in which the
    // (translated) subject sequence aligned.
    nsseq () {
        switch (this.props.algorithm) {
            case 'blastp':
            case 'blastx':
            case 'tblastn':
            case 'tblastx':
                return this.hsp.sframe >= 0 ? this.hsp.sstart : this.hsp.send;
            case 'blastn':
                // BLASTN is a bit weird in that, no matter which direction the
                // subject sequence aligned in, sstart is taken as alignment
                // start coordinate for subject.
                return this.hsp.sstart
        }
    }

    // Jump in query coordinate.
    //
    // Roughly,
    //
    //   qend = qstart + n * qframe_unit
    //
    // This will be 1 or 3 depending on whether the query sequence was
    // translated or not.
    qframe_unit () {
        switch (this.props.algorithm) {
            case 'blastp':
            case 'blastn':
            case 'tblastn':
                return 1;
            case 'blastx':
                // _Translated_ nucleotide query against protein database.
            case 'tblastx':
                // _Translated_ nucleotide query against translated
                // nucleotide database.
                return 3;
        }
    }

    // Jump in subject coordinate.
    //
    // Roughly,
    //
    //   send = sstart + n * sframe_unit
    //
    // This will be 1 or 3 depending on whether the subject sequence was
    // translated or not.
    sframe_unit () {
        switch (this.props.algorithm) {
            case 'blastp':
            case 'blastx':
            case 'blastn':
                return 1;
            case 'tblastn':
                // Protein query against _translated_ nucleotide database.
                return 3;
            case 'tblastx':
                // Translated nucleotide query against _translated_
                // nucleotide database.
                return 3;
        }
    }

    // If we should add or subtract qframe_unit from qstart to arrive at qend.
    //
    // Roughly,
    //
    //   qend = qstart + (qframe_sign) * n * qframe_unit
    //
    // This will be +1 or -1, depending on the direction in which the
    // (translated) query sequence aligned.
    qframe_sign () {
        return this.hsp.qframe >= 0 ? 1 : -1;
    }

    // If we should add or subtract sframe_unit from sstart to arrive at send.
    //
    // Roughly,
    //
    //   send = sstart + (sframe_sign) * n * sframe_unit
    //
    // This will be +1 or -1, depending on the direction in which the
    // (translated) subject sequence aligned.
    sframe_sign () {
        return this.hsp.sframe >= 0 ? 1 : -1;
    }


    /**
     * Return prettified stats for the given hsp and based on the BLAST
     * algorithm.
     */
    getStats (hsp) {
        var stats = {
            'score': Utils.inTwoDecimal(hsp.bit_score) + '(' + + hsp.score + ')',
            'e value': Utils.inScientificOrTwodecimal(hsp.evalue),
            'identity': hsp.identity,
            'gaps': hsp.gaps,
            'coverage': hsp.qcovhsp
        };

        switch (this.props.algorithm) {
        case 'tblastx':
            _.extend(stats, {
                'frame': Utils.inFraction(hsp.qframe, hsp.sframe)
            });
            // fall-through
        case 'blastp':
            _.extend(stats, {
                'positives': hsp.positives
            });
            break;
        case 'blastn':
            _.extend(stats, {
                'strand': (hsp.qframe > 0 ? '+' : '-') +
                          "/"                          +
                          (hsp.sframe > 0 ? '+' : '-')
            });
            break;
        case 'blastx':
            _.extend(stats, {
                'query frame': hsp.qframe
            });
            break;
        case 'tblastn':
            _.extend(stats, {
                'hit frame': hsp.sframe
            });
            break;
        }

        return stats;
    }

    /**
     * Pad given coord with ' ' till its length == width. Returns undefined if
     * width is not supplied.
     */
    formatCoords (coord, width) {
        if (width) {
            let padding = width - coord.toString().length;
            return Array(padding + 1).join(' ').concat([coord]);
        }
    }

    /**
     * Wrap each character of the given sequence in span tags.
     */
    formatSeq (seq) {
        var el = [];
        for (let i = 0; i < seq.length; i++) {
            el.push(<span>{seq[i]}</span>);
        }
        el.push((<br/>));
        return el;
    }


}
