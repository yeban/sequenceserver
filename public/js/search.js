import _ from 'underscore';
import React from 'react';


/**
 * Load necessary polyfills.
 */
$.webshims.polyfill('forms');

/** Drag n drop widget.
 */
var DnD = React.createClass({

    getInitialState: function () {
        return {
            query: null
        }
    },

    render: function () {
        return (
            <div
                className="dnd-overlay"
                style={{display: "none"}}>
                <div
                    className="container dnd-overlay-container">
                    <div
                        className="row">
                        <div
                            className="col-md-offset-2 col-md-10">
                            <p
                                className="dnd-overlay-drop"
                                style={{display: "none"}}>
                                <i className="fa fa-2x fa-file-o"></i>
                                Drop query sequence file here
                            </p>
                            <p
                                className="dnd-overlay-overwrite"
                                style={{display: "none"}}>
                                <i className="fa fa-2x fa-file-o"></i>
                                <span style={{color: "red"}}>Overwrite</span> query sequence file
                            </p>

                            <div
                                className="dnd-errors">
                                <div
                                    className="dnd-error row"
                                    id="dnd-multi-notification"
                                    style={{display: "none"}}>
                                    <div
                                        className="col-md-6 col-md-offset-3">
                                        One file at a time please.
                                    </div>
                                </div>

                                <div
                                    className="dnd-error row"
                                    id="dnd-large-file-notification"
                                    style={{display: "none"}}>
                                    <div
                                        className="col-md-6 col-md-offset-3">
                                        Too big a file. Can only do less than 10 MB. &gt;_&lt;
                                    </div>
                                </div>

                                <div
                                    className="dnd-error row"
                                    id="dnd-format-notification"
                                    style={{display: "none"}}>
                                    <div
                                        className="col-md-6 col-md-offset-3">
                                        Only FASTA files please.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    componentDidMount: function () {
        var self = this;

        $(document).ready(function(){
            var tgtMarker = $('.dnd-overlay');

            var dndError = function (id) {
                $('.dnd-error').hide();
                $('#' + id + '-notification').show();
                tgtMarker.effect('fade', 2500);
            };

            $(document)
            .on('dragenter', function (evt) {
                // Do not activate DnD if a modal is active.
                if ($.modalActive()) return;

                // Based on http://stackoverflow.com/a/8494918/1205465.
                // Contrary to what the above link says, the snippet below can't
                // distinguish directories from files. We handle that on drop.
                var dt = evt.originalEvent.dataTransfer;
                var isFile = dt.types && ((dt.types.indexOf &&  // Chrome and Safari
                                           dt.types.indexOf('Files') != -1) ||
                                           (dt.types.contains && // Firefox
                                            dt.types.contains('application/x-moz-file')));

                if (!isFile) { return; }

                $('.dnd-error').hide();
                tgtMarker.stop(true, true);
                tgtMarker.show();
                dt.effectAllowed = 'copy';
                if (self.state.query.isEmpty()) {
                    $('.dnd-overlay-overwrite').hide();
                    $('.dnd-overlay-drop').show('drop', {direction: 'down'}, 'fast');
                }
                else {
                    $('.dnd-overlay-drop').hide();
                    $('.dnd-overlay-overwrite').show('drop', {direction: 'down'}, 'fast');
                }
            })
            .on('dragleave', '.dnd-overlay', function (evt) {
                tgtMarker.hide();
                $('.dnd-overlay-drop').hide();
                $('.dnd-overlay-overwrite').hide();
            })
            .on('dragover', '.dnd-overlay', function (evt) {
                evt.originalEvent.dataTransfer.dropEffect = 'copy';
                evt.preventDefault();
            })
            .on('drop', '.dnd-overlay', function (evt) {
                evt.preventDefault();
                evt.stopPropagation();

                var indicator = $('#sequence-file');
                self.state.query.focus();

                var files = evt.originalEvent.dataTransfer.files;
                if (files.length > 1) {
                    dndError('dnd-multi');
                    return;
                }

                var file = files[0];
                if (file.size > 10 * 1048576) {
                    dndError('dnd-large-file');
                    return;
                }

                var reader = new FileReader();
                reader.onload = function (e) {
                    var content = e.target.result;
                    if (SequenceServer.FASTA_FORMAT.test(content)) {
                        self.state.query.value(content);
                        indicator.text(file.name);
                        tgtMarker.hide();
                    } else {
                        // apparently not FASTA
                        dndError('dnd-format');
                    }
                };
                reader.onerror = function (e) {
                    // Couldn't read. Means dropped stuff wasn't FASTA file.
                    dndError('dnd-format');
                };
                reader.readAsText(file);
            });
        });
    }
});

/**
 * Query widget.
 */
var Query = React.createClass({

    // Kind of public API. //

    /**
     * Sets query to given value or returns current value. Returns `this` when
     * used as a setter.
     */
    value: function (val) {
        if (val !== undefined) {
            this.setState({
                value: val,
                type: this.guessQueryType(val)
            })
            return this;
        }
        return this.state.value;
    },

    /**
     * Clears textarea. Returns `this`.
     *
     * Clearing textarea also causes it to be focussed.
     */
    clear: function () {
        return this.value('').focus();
    },

    /**
     * Focuses textarea. Returns `this`.
     */
    focus: function () {
        this.textarea().focus();
        return this;
    },

    /**
     * Returns true if query is absent ('', undefined, null), false otherwise.
     */
    isEmpty: function () {
        return !this.value();
    },


    // Internal helpers. //

    textarea: function () {
        return $(this.refs.textarea.getDOMNode());
    },

    controls: function () {
        return $(this.refs.controls.getDOMNode());
    },

    handleInput: function (evt) {
        this.value(evt.target.value);
    },

    /**
     * Hides or shows 'clear sequence' button.
     *
     * Rendering the 'clear sequence' button takes into account presence or
     * absence of a scrollbar.
     *
     * Called by `componentDidUpdate`.
     */
    hideShowControls: function () {
        if (!this.isEmpty()) {
            // Calculation below is based on -
            // http://chris-spittles.co.uk/jquery-calculate-scrollbar-width/
            // FIXME: can reflow be avoided here?
            var textareaNode = this.textarea()[0];
            var sequenceControlsRight = textareaNode.offsetWidth - textareaNode.clientWidth;
            this.controls().css('right', sequenceControlsRight + 17);
            this.controls().removeClass('hidden');
        }
        else {
            // FIXME: what are lines 1, 2, & 3 doing here?
            this.textarea().parent().removeClass('has-error');
            this.$sequenceFile = $('#sequence-file');
            this.$sequenceFile.empty();

            this.controls().addClass('hidden');
        }
    },

    /**
     * Put red border around textarea.
     */
    indicateError: function () {
        this.textarea().parent().addClass('has-error');
    },

    /**
     * Put normal blue border around textarea.
     */
    indicateNormal: function () {
        this.textarea().parent().removeClass('has-error');
    },

    /**
     * Returns type of the query sequence (nucleotide, protein, mixed).
     *
     * Query widget supports executing a callback when the query type changes.
     * Components interested in query type should register a callback instead
     * of directly calling this method.
     */
    guessQueryType: function (query) {
        var sequences = query.split(/>.*/);

        var type, tmp;

        for (var i = 0; i < sequences.length; i++) {
            tmp = this.guessSequenceType(sequences[i]);

            // could not guess the sequence type; try the next sequence
            if (!tmp) { continue; }

            if (!type) {
              // successfully guessed the type of atleast one sequence
              type = tmp;
            }
            else if (tmp !== type) {
              // user has mixed different type of sequences
              return 'mixed';
            }
        }

        return type;
    },

    /**
     * Guesses and returns the type of the given sequence (nucleotide,
     * protein).
     */
    guessSequenceType: function (sequence) {
        // remove 'noisy' characters
        sequence = sequence.replace(/[^A-Z]/gi, ''); // non-letter characters
        sequence = sequence.replace(/[NX]/gi,   ''); // ambiguous  characters

        // can't determine the type of ultrashort queries
        if (sequence.length < 10) {
            return undefined;
        }

        // count the number of putative NA
        var putative_NA_count = 0;
        for (var i = 0; i < sequence.length; i++) {
            if (sequence[i].match(/[ACGTU]/i)) {
                putative_NA_count += 1;
            }
        }

        var threshold = 0.9 * sequence.length;
        return putative_NA_count > threshold ? 'nucleotide' : 'protein';
    },

    /**
     * Notify user regarding the given sequence type: an alert message is shown
     * and the textarea highlighted in red in case of error.
     */
    notify: function (type) {
        // Reset.
        this.indicateNormal();
        Notifications.reset();

        // Notify.
        if (type) {
            Notifications.show(type);
            if (type === 'mixed') {
                this.indicateError();
            }
        }
    },


    // Lifecycle methods. //

    getInitialState: function () {
        return {
            value: '',
            type: undefined
        };
    },

    render: function ()
    {
        return (
            <div
                className="form-group query-container">
                <div
                    className="col-md-12">
                    <div
                        className="sequence">
                        <textarea
                            className="form-control text-monospace" id="sequence"
                            rows="10" spellCheck="false" autoFocus="true"
                            name="sequence"   value={this.state.value}
                            ref="textarea" onChange={this.handleInput}
                            placeholder="Paste query sequence(s) or drag file containing query sequence(s) in FASTA format here ..." >
                        </textarea>
                    </div>
                    <div
                        className="hidden"
                        style={{ position: 'absolute', top: '4px', right: '19px' }}
                        ref="controls">
                        <button
                            type="button"
                            className="btn btn-sm btn-default" id="btn-sequence-clear"
                            title="Clear query sequence(s)."
                            onClick={this.clear}>
                            <span id="sequence-file"></span>
                            <i className="fa fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        );
    },

    componentDidUpdate: function (props, state) {
        if (this.state.type !== state.type) {
            this.props.onSequenceTypeChange(this.state.type);
            this.notify(this.state.type);
        }
        this.hideShowControls();
    }
});

/**
 * Query type notifications.
 */
var Notifications = React.createClass({

    /**
     * Class methods.
     */
    statics: {
        /**
         * Hide notifications automatically after this many milliseconds.
         */
        TIMEOUT_INTERVAL: 5000,

        /**
         * Show notification defined for the given type and set a timer to hide
         * the notification after TIMEOUT_INTERVAL.
         */
        show: function (type) {
            // Reset.
            clearTimeout(this.timeout);
            this._active && this._active.hide();

            // Show and set timer.
            var id = '#' + type + '-sequence-notification';
            this._active = $(id).show('drop', {direction: 'up'});
            this.timeout = setTimeout(_.bind(this.hide, this), this.TIMEOUT_INTERVAL);
        },

        /**
         * Hide the active notification and clear the timer if any.
         */
        hide: function () {
            clearTimeout(this.timeout);
            this._active && this._active.hide('drop', {direction: 'up'});
            this._active = null;
        }
    },


    // Lifecycle methods. //

    render: function () {
        return (
            <div
                className="notifications" id="notifications">
                <div
                    className="notification row"
                    id="protein-sequence-notification"
                    style={{ display: 'none' }}>
                    <div
                        className="alert-info col-md-6 col-md-offset-3">
                        Detected: amino-acid sequence(s).
                    </div>
                </div>
                <div
                    className="notification row"
                    id="nucleotide-sequence-notification"
                    style={{ display: 'none' }}>
                    <div
                        className="alert-info col-md-6 col-md-offset-3">
                        Detected: nucleotide sequence(s).
                    </div>
                </div>
                <div
                    className="notification row"
                    id="mixed-sequence-notification"
                    style={{ display: 'none' }}>
                    <div
                        className="alert-danger col-md-10 col-md-offset-1">
                        Detected: mixed nucleotide and amino-acid sequences. We
                        can't handle that. Please try one sequence at a time.
                    </div>
                </div>
            </div>
        );
    },

    componentDidMount: function () {
        $(document).click(_.bind(Notifications.hide, Notifications));
    },
});


/**
 * Databases component.
 *
 * Categorises, sorts and renders a list of database recieved via props.
 */
var Databases = React.createClass({

    // Internal helpers. //

    /**
     * Returns a list of databases we have.
     */
    databases: function () {
        return this.props.store.databases;
    },

    /**
     * Returns a sorted list of the categories in which the databases fall.
     */
    categories: function () {
        return _.uniq(_.map(this.databases(),
                            _.iteratee('type'))).sort();
    },

    /**
     * Returns the list of databases in the given category, sorted by database
     * title.
     */
    filterDatabases: function (category) {
        return _.sortBy(_.select(this.databases(),
                                 function (database) {
                                     return database.type === category;
                                 }),
                                 function (database) {
                                     return database.title;
                                 });

    },

    /**
     * Select the given database.
     */
    selectUnselect: function (database) {
        var selected = this.state.selected;
        var type;

        if (selected.has(database.id)) {
            selected.delete(database.id);
            //if (selected.sizes == 0) type = '';
        }
        else {
            selected.add(database.id);
            //if (selected.sizes == 1) type = database.type;
        }

        var type = selected.size && database.type || '';

        this.setState({
            selected: selected,
            type: type
        })
    },


    // Lifecycle methods. //

    getInitialState: function () {
        return {
            selected: new Set(),
            type: ''
        };
    },

    render: function () {
        return (
            <div
              className="form-group databases-container">
                {
                    _.map(this.categories(), _.bind(function (category) {
                        return (
                            <div
                                className={this.categories().length === 1 ? 'col-md-12' : 'col-md-6'}>
                                <div
                                    className="panel panel-default">
                                    <div
                                        className="panel-heading">
                                        <h4>{category[0].toUpperCase() + category.substring(1).toLowerCase() + " databases"}</h4>
                                    </div>
                                    <ul
                                        className={"list-group databases " + category}>
                                        {
                                            _.map(this.filterDatabases(category), _.bind(function (database) {
                                                return (
                                                    <li
                                                        className="list-group-item">
                                                        <label
                                                            className={(this.state.type && this.state.type !== database.type) && "disabled"}>
                                                            <input type="checkbox"
                                                                name="databases[]" value={database.id}
                                                                checked={this.state.selected.has(database.id)}
                                                                onChange={_.bind(this.selectUnselect, this, database)}
                                                                disabled={this.state.type && this.state.type !== database.type}/>
                                                            {" " + (database.title || database.name)}
                                                        </label>
                                                    </li>
                                                );
                                            }, this))
                                        }
                                    </ul>
                                </div>
                            </div>
                        )
                    }, this))
                }
            </div>
        );
    },

    componentWillReceiveProps: function (props) {
        var databases = props.store.databases;
        if (databases && databases.length === 1) {
            this.selectUnselect(databases[0]);
        }
    },

    shouldComponentUpdate: function (props, state) {
        return props !== this.props || state !== this.state;
    },

    componentWillUpdate: function (props, state) {
        if (state.type !== this.state.type) {
            this.props.onDatabaseTypeChange(state.type);
        }
    }
});


/**
 * Search options input field widget.
 */
var Options = React.createClass({

    // Kind of public API. //

    /**
     * Sets options to the given value or returns current value. Returns `this`
     * when used as a setter.
     */
    value: function (val) {
        if (val !== undefined) {
            this.setState({
                value: val
            })
            return this;
        }
        return this.state.value;
    },

    /**
     * Clears input. Returns `this`.
     *
     * Clearing input also causes it to be focussed.
     */
    clear: function () {
        return this.value('').focus();
    },

    /**
     * Focuses input. Returns `this`.
     */
    focus: function () {
        this.input().focus();
        return this;
    },

    /**
     * Returns true if options is absent ('', undefined, null), false
     * otherwise.
     */
    isEmpty: function () {
        return !this.value();
    },


    // Internal helpers. //

    /**
     * Returns jQuery wrapped input field.
     */
    input: function () {
        return $(this.refs.input.getDOMNode());
    },

    /**
     * Reacts to user input - called in render.
     */
    handleInput: function (evt) {
        this.value(evt.target.value);
    },


    // Lifecycle methods. //

    getInitialState: function () {
        return {
            value: ''
        }
    },

    render: function () {
        return (
            <div
                className="col-md-8">
                <div
                    className="form-group">
                    <div
                        className="col-md-12">
                        <div
                            className="input-group">
                            <label
                                className="control-label"
                                htmlFor="advanced">
                                Advanced parameters:
                            </label>
                            <input
                                type="text" className="form-control"
                                name="advanced" value={this.state.value}
                                ref="input"  onChange={this.handleInput}
                                title="View, and enter advanced parameters."
                                placeholder="eg: -evalue 1.0e-5 -num_alignments 100"
                                />
                            <div
                                className="input-group-addon cursor-pointer"
                                data-toggle="modal" data-target="#help">
                                <i className="fa fa-question"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});


/**
 * SearchButton widget.
 */
var SearchButton = React.createClass({

    // Internal helpers. //

    /**
     * Returns jquery wrapped input group.
     */
    inputGroup: function () {
        return $(React.findDOMNode(this.refs.inputGroup));
    },

    /**
     * Returns jquery wrapped submit button.
     */
    submitButton: function () {
        return $(React.findDOMNode(this.refs.submitButton));
    },

    /**
     * Initialise tooltip on input group and submit button.
     */
    initTooltip: function () {
        this.inputGroup().tooltip({
            trigger: 'manual',
            title: _.bind(function () {
                if (!this.state.hasQuery && !this.state.hasDatabases) {
                    return "You must enter a query sequence and select one or more databases above before you can run a search!";
                }
                else if (this.state.hasQuery && !this.state.hasDatabases) {
                    return "You must select one or more databases above before you can run a search!";
                }
                else if (!this.state.hasQuery && this.state.hasDatabases) {
                    return "You must enter a query sequence above before you can run a search!";
                }
            }, this)
        });

        this.submitButton().tooltip({
            title: _.bind(function () {
                var title = "Click to BLAST or press Ctrl+Enter.";
                if (this.state.methods.length > 1) {
                    title += " Click dropdown button on the right for other" +
                        " BLAST algorithms that can be used.";
                }
                return title;
            }, this)
        });
    },

    /**
     * Show tooltip on input group.
     */
    showTooltip: function () {
        this.inputGroup()._tooltip('show');
    },

    /**
     * Hide tooltip on input group.
     */
    hideTooltip: function () {
        this.inputGroup()._tooltip('hide');
    },

    /**
     * Change selected algorithm.
     *
     * NOTE: Called on click on dropdown menu items.
     */
    changeAlgorithm: function (method) {
        var methods = this.state.methods.slice();
        methods.splice(methods.indexOf(method), 1);
        methods.unshift(method);
        this.setState({
            methods: methods
        });
    },

    /**
     * Given, for example 'blastp', returns blast<strong>p</strong>.
     */
    decorate: function(name) {
        return name.match(/(.?)(blast)(.?)/).slice(1).map(function (token, _) {
            if (token) {
                if (token !== 'blast'){
                    return (<strong key={token}>{token}</strong>);
                }
                else {
                    return token;
                }
            }
        });
    },


    // Lifecycle methods. //

    getInitialState: function () {
        return {
            methods: [],
            hasQuery: false,
            hasDatabases: false
        }
    },

    render: function () {
        var methods = this.state.methods;
        var method = methods[0];
        var multi = methods.length > 1;

        return (
            <div className="col-md-4">
                <div className="form-group">
                    <div className="col-md-12">
                        <div
                            className={multi && 'input-group'} id="methods" ref="inputGroup"
                            onMouseOver={this.showTooltip} onMouseOut={this.hideTooltip}>
                            <button
                                type="submit" className="btn btn-primary form-control text-uppercase"
                                id="method" ref="submitButton" name="method" value={method} disabled={!method}>
                                {this.decorate(method || 'blast')}
                            </button>
                            {
                                multi && <div
                                    className="input-group-btn">
                                    <button
                                        className="btn btn-primary dropdown-toggle"
                                        data-toggle="dropdown">
                                        <span className="caret"></span>
                                    </button>
                                    <ul
                                        className="dropdown-menu dropdown-menu-right">
                                        {
                                            _.map(methods.slice(1), _.bind(function (method) {
                                                return (
                                                    <li key={method} className="text-uppercase"
                                                        onClick={
                                                            _.bind(function () {
                                                                this.changeAlgorithm(method);
                                                            }, this)
                                                        }>
                                                        {method}
                                                    </li>
                                                );
                                            }, this))
                                        }
                                    </ul>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    componentDidMount: function () {
        this.initTooltip();
    },

    shouldComponentUpdate: function (props , state) {
        return !(_.isEqual(state.methods, this.state.methods));
    },

    componentDidUpdate: function () {
        if (this.state.methods.length > 0) {
            this.inputGroup().wiggle();
        }
        this.props.onAlgorithmChange(this.state.methods[0]);
    }
});

/**
 * Search form.
 *
 * Contains query, databases, advanced params and submit button components;
 * facilitates communication between them.
 */
var Form = React.createClass({

    // Internal helpers. //

    /**
     * Submit the form programatically.
     *
     * Used for the submit keyboard shortcut defined later.
     *
     * NOTE: We trigger click on the submit button to do so. This, in my
     * understanding, has a few advantages over triggering submit on the
     * form.  For example, this automatically avoids submitting the form
     * when submit button is disabled. Further, the value attribute of
     * submit button is correctly picked this way.
     */
    submit: function () {
        $(React.findDOMNode(this.refs.button.refs.submitButton)).click();
    },

    /**
     * Called when sequence type changes.
     *
     * Passed to the query component which calls it at the right time.
     */
    handleSequenceTypeChange: function (type) {
        this.sequenceType = type;
        this.refs.button.setState({
            hasQuery: !this.refs.query.isEmpty(),
            hasDatabases: !!this.databaseType,
            methods: this.determineBlastMethod()
        });
    },

    /**
     * Called when database type changes.
     *
     * Passed to the databases component which calls it at the right time.
     */
    handleDatabaseTypeChange: function (type) {
        this.databaseType = type;
        this.refs.button.setState({
            hasQuery: !this.refs.query.isEmpty(),
            hasDatabases: !!this.databaseType,
            methods: this.determineBlastMethod()
        });
    },

    /**
     * Called when algorithm changes.
     *
     * Passed to the search button component which calls it at the right time.
     */
    updateOptions: function (algorithm) {
        this.refs.options.value(this.props.store.options[algorithm] || '');
    },

    /**
     * Determines applicable search algorithms based on the value of
     * `this.databaseType`, `this.sequenceType` and whether the user
     * has entered a query or not.
     *
     * Returns an array containing zero, one, or two items.
     */
    determineBlastMethod: function () {
        if (this.refs.query.isEmpty()) {
            return [];
        }

        // database type is always known
        switch (this.databaseType) {
            case 'protein':
                switch (this.sequenceType) {
                    case undefined:
                        return ['blastp', 'blastx'];
                    case 'protein':
                        return ['blastp'];
                    case 'nucleotide':
                        return ['blastx'];
                }
                break;
            case 'nucleotide':
                switch (this.sequenceType) {
                    case undefined:
                        return ['tblastn', 'blastn', 'tblastx'];
                    case 'protein':
                        return ['tblastn'];
                    case 'nucleotide':
                        return ['blastn', 'tblastx'];
                }
                break;
        }

        return [];
    },


    // Lifecycle methods. //

    render: function () {
        return (
            <form
                className="form-horizontal" id="blast"
                method="post" target="_blank">
                <Query
                    ref="query"
                    onSequenceTypeChange={this.handleSequenceTypeChange}/>
                <Notifications/>
                <Databases
                    ref="databases" store={this.props.store}
                    onDatabaseTypeChange={this.handleDatabaseTypeChange}/>
                <div
                    className="form-group">
                    <Options ref="options"/>
                    <SearchButton
                        ref="button" onAlgorithmChange={this.updateOptions}/>
                </div>
            </form>
        );
    }
});


/**
 * Search page - is exported from search.js.
 *
 * Contains search form and drag n drop components. Retrieves data from server
 * and passes it to child components as props. Data fetched from the server is
 * stored as Page's state. Further, keyboard shortcuts are set up by Page.
 */
var Page = React.createClass({

    // Internal helpers. //

    /**
     * Setup keyboard shortcuts.
     *
     * Currently only the 'Ctrl-Enter' shortcut to trigger form submission.
     */
    setupKeyboardShortcuts: function () {
        $(document).bind('keydown', _.bind(function (e) {
            if (e.ctrlKey && e.keyCode === 13) {
                this.refs.form.submit();
                e.stopPropagation();
                e.preventDefault();
            }
        }, this));
    },

    /**
     * Gets data for the entire page from the server. The data received is set
     * in `this.state.store`, thus triggering a redraw.
     */
    fetchData: function () {
        $.getJSON('searchdata.json', _.bind(function (data) {
            this.setState({ store: data });
        }, this));
    },

    /**
     * Initialise drag and drop.
     *
     * Drag and drop can be activated only after we have a handle to the Query
     * component.
     */
    initDnD: function () {
        this.refs.dnd.setState({
            query: this.refs.form.refs.query
        });
    },


    // Lifecycle methods. //

    /**
     * Initialise with an empty store.
     */
    getInitialState: function () {
        return {
            store: {}
        }
    },

    /**
     * Render search from and DnD boilerplate.
     */
    render: function () {
        return (
            <div>
                <DnD ref="dnd"/>
                <div className="container">
                    <Form ref="form" store={this.state.store}/>
                </div>
            </div>
        );
    },

    /**
     * Fetch data from server and initialises drag n drop.
     */
    componentDidMount: function () {
        this.initDnD();
        this.fetchData();
        this.setupKeyboardShortcuts();
    }
});

export {Page};
