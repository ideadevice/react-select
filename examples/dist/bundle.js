require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var React = require('react');

var Option = React.createClass({

	displayName: 'Value',

	propTypes: {
		label: React.PropTypes.string.isRequired,
		onOptionLabelClick: React.PropTypes.func,
		onRemove: React.PropTypes.func,
		optionLabelClick: React.PropTypes.bool
	},

	blockEvent: function blockEvent(event) {
		event.stopPropagation();
	},

	render: function render() {
		var label = this.props.label;

		if (this.props.optionLabelClick) {
			label = React.createElement(
				'a',
				{ className: 'Select-item-label__a',
					onMouseDown: this.blockEvent,
					onTouchEnd: this.props.onOptionLabelClick,
					onClick: this.props.onOptionLabelClick },
				label
			);
		}

		return React.createElement(
			'div',
			{ className: 'Select-item' },
			React.createElement(
				'span',
				{ className: 'Select-item-icon',
					onMouseDown: this.blockEvent,
					onClick: this.props.onRemove,
					onTouchEnd: this.props.onRemove },
				'×'
			),
			React.createElement(
				'span',
				{ className: 'Select-item-label' },
				label
			)
		);
	}

});

module.exports = Option;

},{"react":undefined}],"react-select":[function(require,module,exports){
/* disable some rules until we refactor more completely; fixing them now would
   cause conflicts with some open PRs unnecessarily. */
/* eslint react/jsx-sort-prop-types: 0, react/sort-comp: 0, react/prop-types: 0 */

'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');
var Input = require('react-input-autosize');
var classes = require('classnames');
var Value = require('./Value');

var requestId = 0;

var Select = React.createClass({

	displayName: 'Select',

	propTypes: {
		value: React.PropTypes.any, // initial field value
		multi: React.PropTypes.bool, // multi-value input
		disabled: React.PropTypes.bool, // whether the Select is disabled or not
		options: React.PropTypes.array, // array of options
		delimiter: React.PropTypes.string, // delimiter to use to join multiple values
		asyncOptions: React.PropTypes.func, // function to call to get options
		autoload: React.PropTypes.bool, // whether to auto-load the default async options set
		placeholder: React.PropTypes.string, // field placeholder, displayed when there's no value
		noResultsText: React.PropTypes.string, // placeholder displayed when there are no matching search results
		clearable: React.PropTypes.bool, // should it be possible to reset value
		clearValueText: React.PropTypes.string, // title for the "clear" control
		clearAllText: React.PropTypes.string, // title for the "clear" control when multi: true
		searchable: React.PropTypes.bool, // whether to enable searching feature or not
		searchPromptText: React.PropTypes.string, // label to prompt for search input
		name: React.PropTypes.string, // field name, for hidden <input /> tag
		onChange: React.PropTypes.func, // onChange handler: function(newValue) {}
		onFocus: React.PropTypes.func, // onFocus handler: function(event) {}
		onBlur: React.PropTypes.func, // onBlur handler: function(event) {}
		className: React.PropTypes.string, // className for the outer element
		filterOption: React.PropTypes.func, // method to filter a single option: function(option, filterString)
		filterOptions: React.PropTypes.func, // method to filter the options array: function([options], filterString, [values])
		matchPos: React.PropTypes.string, // (any|start) match the start or entire string when filtering
		matchProp: React.PropTypes.string, // (any|label|value) which option property to filter on
		ignoreCase: React.PropTypes.bool, // whether to perform case-insensitive filtering
		inputProps: React.PropTypes.object, // custom attributes for the Input (in the Select-control) e.g: {'data-foo': 'bar'}
		allowCreate: React.PropTypes.bool, // wether to allow creation of new entries
		/*
  * Allow user to make option label clickable. When this handler is defined we should
  * wrap label into <a>label</a> tag.
  *
  * onOptionLabelClick handler: function (value, event) {}
  *
  */
		onOptionLabelClick: React.PropTypes.func
	},

	getDefaultProps: function getDefaultProps() {
		return {
			value: undefined,
			options: undefined,
			disabled: false,
			delimiter: ',',
			asyncOptions: undefined,
			autoload: true,
			placeholder: 'Select...',
			noResultsText: 'No results found',
			clearable: true,
			clearValueText: 'Clear value',
			clearAllText: 'Clear all',
			searchable: true,
			searchPromptText: 'Type to search',
			name: undefined,
			onChange: undefined,
			className: undefined,
			matchPos: 'any',
			matchProp: 'any',
			ignoreCase: true,
			inputProps: {},
			allowCreate: false,

			onOptionLabelClick: undefined
		};
	},

	getInitialState: function getInitialState() {
		return {
			/*
    * set by getStateFromValue on componentWillMount:
    * - value
    * - values
    * - filteredOptions
    * - inputValue
    * - placeholder
    * - focusedOption
   */
			options: this.props.options,
			isFocused: false,
			isOpen: false,
			isLoading: false
		};
	},

	componentWillMount: function componentWillMount() {
		this._optionsCache = {};
		this._optionsFilterString = '';

		var self = this;
		this._closeMenuIfClickedOutside = function (event) {
			if (!self.state.isOpen) {
				return;
			}
			var menuElem = self.refs.selectMenuContainer.getDOMNode();
			var controlElem = self.refs.control.getDOMNode();

			var eventOccuredOutsideMenu = self.clickedOutsideElement(menuElem, event);
			var eventOccuredOutsideControl = self.clickedOutsideElement(controlElem, event);

			// Hide dropdown menu if click occurred outside of menu
			if (eventOccuredOutsideMenu && eventOccuredOutsideControl) {
				self.setState({
					isOpen: false
				}, self._unbindCloseMenuIfClickedOutside);
			}
		};

		this._bindCloseMenuIfClickedOutside = function () {
			if (!document.addEventListener && document.attachEvent) {
				document.attachEvent('onclick', this._closeMenuIfClickedOutside);
			} else {
				document.addEventListener('click', this._closeMenuIfClickedOutside);
			}
		};

		this._unbindCloseMenuIfClickedOutside = function () {
			if (!document.removeEventListener && document.detachEvent) {
				document.detachEvent('onclick', this._closeMenuIfClickedOutside);
			} else {
				document.removeEventListener('click', this._closeMenuIfClickedOutside);
			}
		};

		this.setState(this.getStateFromValue(this.props.value), function () {
			//Executes after state change is done. Fixes issue #201
			if (this.props.asyncOptions && this.props.autoload) {
				this.autoloadAsyncOptions();
			}
		});
	},

	componentWillUnmount: function componentWillUnmount() {
		clearTimeout(this._blurTimeout);
		clearTimeout(this._focusTimeout);

		if (this.state.isOpen) {
			this._unbindCloseMenuIfClickedOutside();
		}
	},

	componentWillReceiveProps: function componentWillReceiveProps(newProps) {
		if (JSON.stringify(newProps.options) !== JSON.stringify(this.props.options)) {
			this.setState({
				options: newProps.options,
				filteredOptions: this.filterOptions(newProps.options)
			});
		}
		if (newProps.value !== this.state.value) {
			this.setState(this.getStateFromValue(newProps.value, newProps.options));
		}
	},

	componentDidUpdate: function componentDidUpdate() {
		var self = this;

		if (!this.props.disabled && this._focusAfterUpdate) {
			clearTimeout(this._blurTimeout);

			this._focusTimeout = setTimeout(function () {
				self.getInputNode().focus();
				self._focusAfterUpdate = false;
			}, 50);
		}

		if (this._focusedOptionReveal) {
			if (this.refs.focused && this.refs.menu) {
				var focusedDOM = this.refs.focused.getDOMNode();
				var menuDOM = this.refs.menu.getDOMNode();
				var focusedRect = focusedDOM.getBoundingClientRect();
				var menuRect = menuDOM.getBoundingClientRect();

				if (focusedRect.bottom > menuRect.bottom || focusedRect.top < menuRect.top) {
					menuDOM.scrollTop = focusedDOM.offsetTop + focusedDOM.clientHeight - menuDOM.offsetHeight;
				}
			}

			this._focusedOptionReveal = false;
		}
	},

	focus: function focus() {
		this.getInputNode().focus();
	},

	clickedOutsideElement: function clickedOutsideElement(element, event) {
		var eventTarget = event.target ? event.target : event.srcElement;
		while (eventTarget != null) {
			if (eventTarget === element) return false;
			eventTarget = eventTarget.offsetParent;
		}
		return true;
	},

	getStateFromValue: function getStateFromValue(value, options) {
		if (!options) {
			options = this.state.options;
		}

		// reset internal filter string
		if (this.props.allowCreate && value && typeof value === 'string') {
			if (options && options.filter(function (o) {
				return o.value === value;
			}).length > 0) {
				this._optionsFilterString = '';
			} else {
				this._optionsFilterString = value;
			}
		} else {
			this._optionsFilterString = '';
		}

		var values = this.initValuesArray(value, options),
		    filteredOptions = this.filterOptions(options, values);

		return {
			value: values.map(function (v) {
				return v.value;
			}).join(this.props.delimiter),
			values: values,
			inputValue: this._optionsFilterString,
			filteredOptions: filteredOptions,
			placeholder: !this.props.multi && values.length ? values[0].label : this.props.placeholder,
			focusedOption: !this.props.multi && values.length ? values[0] : filteredOptions[0]
		};
	},

	initValuesArray: function initValuesArray(values, options) {
		if (!Array.isArray(values)) {
			if (typeof values === 'string') {
				values = values.split(this.props.delimiter);
			} else {
				values = values ? [values] : [];
			}
		}

		return values.map(function (val) {
			if (typeof val === 'string') {
				for (var key in options) {
					if (options.hasOwnProperty(key) && options[key] && options[key].value === val) {
						return options[key];
					}
				}
				return { value: val, label: val };
			} else {
				return val;
			}
		});
	},

	setValue: function setValue(value, focusAfterUpdate) {
		if (focusAfterUpdate || focusAfterUpdate === undefined) {
			this._focusAfterUpdate = true;
		}
		var newState = this.getStateFromValue(value);
		newState.isOpen = false;
		this.fireChangeEvent(newState);
		this.setState(newState);
	},

	selectValue: function selectValue(value) {
		if (!this.props.multi) {
			this.setValue(value);
		} else if (value) {
			this.addValue(value);
		}
		this._unbindCloseMenuIfClickedOutside();
	},

	addValue: function addValue(value) {
		this.setValue(this.state.values.concat(value));
	},

	popValue: function popValue() {
		this.setValue(this.state.values.slice(0, this.state.values.length - 1));
	},

	removeValue: function removeValue(valueToRemove) {
		this.setValue(this.state.values.filter(function (value) {
			return value !== valueToRemove;
		}));
	},

	clearValue: function clearValue(event) {
		// if the event was triggered by a mousedown and not the primary
		// button, ignore it.
		if (event && event.type === 'mousedown' && event.button !== 0) {
			return;
		}
		event.stopPropagation();
		event.preventDefault();
		this.setValue(null);
	},

	resetValue: function resetValue() {
		this.setValue(this.state.value === '' ? null : this.state.value);
	},

	getInputNode: function getInputNode() {
		var input = this.refs.input;
		return this.props.searchable ? input : input.getDOMNode();
	},

	fireChangeEvent: function fireChangeEvent(newState) {
		if (newState.value !== this.state.value && this.props.onChange) {
			this.props.onChange(newState.value, newState.values);
		}
	},

	handleMouseDown: function handleMouseDown(event) {
		// if the event was triggered by a mousedown and not the primary
		// button, or if the component is disabled, ignore it.
		if (this.props.disabled || event.type === 'mousedown' && event.button !== 0) {
			return;
		}

		event.stopPropagation();
		event.preventDefault();
		if (this.state.isFocused) {
			this.setState({
				isOpen: true
			}, this._bindCloseMenuIfClickedOutside);
		} else {
			this._openAfterFocus = true;
			this.getInputNode().focus();
		}
	},

	handleMouseDownOnArrow: function handleMouseDownOnArrow(event) {
		// if the event was triggered by a mousedown and not the primary
		// button, or if the component is disabled, ignore it.
		if (this.props.disabled || event.type === 'mousedown' && event.button !== 0) {
			return;
		}
		// If not focused, handleMouseDown will handle it
		if (!this.state.isOpen) {
			return;
		}

		event.stopPropagation();
		event.preventDefault();
		this.setState({
			isOpen: false
		}, this._unbindCloseMenuIfClickedOutside);
	},

	handleInputFocus: function handleInputFocus(event) {
		var newIsOpen = this.state.isOpen || this._openAfterFocus;
		this.setState({
			inputValue: this.state.value,
			isFocused: true,
			isOpen: newIsOpen
		}, function () {
			if (newIsOpen) {
				this._bindCloseMenuIfClickedOutside();
			} else {
				this._unbindCloseMenuIfClickedOutside();
			}
		});
		this._openAfterFocus = false;

		if (this.props.onFocus) {
			this.props.onFocus(event);
		}
	},

	handleInputBlur: function handleInputBlur(event) {
		var self = this;

		this._blurTimeout = setTimeout(function () {
			if (self._focusAfterUpdate) return;

			self.setState({
				isFocused: false
			});
		}, 50);

		if (this.props.onBlur) {
			this.props.onBlur(event);
		}
	},

	handleKeyDown: function handleKeyDown(event) {
		if (this.state.disabled) return;

		switch (event.keyCode) {

			case 8:
				// backspace
				if (!this.state.inputValue) {
					this.popValue();
				}
				return;

			case 9:
				// tab
				if (event.shiftKey || !this.state.isOpen || !this.state.focusedOption) {
					return;
				}
				this.selectFocusedOption();
				break;

			case 13:
				// enter
				if (!this.state.isOpen) return;

				this.selectFocusedOption();
				break;

			case 27:
				// escape
				if (this.state.isOpen) {
					this.resetValue();
				} else {
					this.clearValue();
				}
				break;

			case 38:
				// up
				this.focusPreviousOption();
				break;

			case 40:
				// down
				this.focusNextOption();
				break;

			case 188:
				// ,
				return;
				break;
				break;

			default:
				return;
		}

		event.preventDefault();
	},

	// Ensures that the currently focused option is available in filteredOptions.
	// If not, returns the first available option.
	_getNewFocusedOption: function _getNewFocusedOption(filteredOptions) {
		for (var key in filteredOptions) {
			if (filteredOptions.hasOwnProperty(key) && filteredOptions[key] === this.state.focusedOption) {
				return filteredOptions[key];
			}
		}
		return filteredOptions[0];
	},

	handleInputChange: function handleInputChange(event) {
		// assign an internal variable because we need to use
		// the latest value before setState() has completed.
		this._optionsFilterString = event.target.value;

		if (this.props.asyncOptions) {
			this.setState({
				isLoading: true,
				inputValue: event.target.value
			});
			this.loadAsyncOptions(event.target.value, {
				isLoading: false,
				isOpen: true
			}, this._bindCloseMenuIfClickedOutside);
		} else {
			var filteredOptions = this.filterOptions(this.state.options);
			this.setState({
				isOpen: true,
				inputValue: event.target.value,
				filteredOptions: filteredOptions,
				focusedOption: this._getNewFocusedOption(filteredOptions)
			}, this._bindCloseMenuIfClickedOutside);
		}
	},

	autoloadAsyncOptions: function autoloadAsyncOptions() {
		var self = this;
		this.loadAsyncOptions('', {}, function () {
			// update with fetched but don't focus
			self.setValue(self.props.value, false);
		});
	},

	loadAsyncOptions: function loadAsyncOptions(input, state, callback) {
		var thisRequestId = this._currentRequestId = requestId++;

		for (var i = 0; i <= input.length; i++) {
			var cacheKey = input.slice(0, i);
			if (this._optionsCache[cacheKey] && (input === cacheKey || this._optionsCache[cacheKey].complete)) {
				var options = this._optionsCache[cacheKey].options;
				var filteredOptions = this.filterOptions(options);

				var newState = {
					options: options,
					filteredOptions: filteredOptions,
					focusedOption: this._getNewFocusedOption(filteredOptions)
				};
				for (var key in state) {
					if (state.hasOwnProperty(key)) {
						newState[key] = state[key];
					}
				}
				this.setState(newState);
				if (callback) callback.call(this, {});
				return;
			}
		}

		var self = this;
		this.props.asyncOptions(input, function (err, data) {

			if (err) throw err;

			self._optionsCache[input] = data;

			if (thisRequestId !== self._currentRequestId) {
				return;
			}
			var filteredOptions = self.filterOptions(data.options);

			var newState = {
				options: data.options,
				filteredOptions: filteredOptions,
				focusedOption: self._getNewFocusedOption(filteredOptions)
			};
			for (var key in state) {
				if (state.hasOwnProperty(key)) {
					newState[key] = state[key];
				}
			}
			self.setState(newState);

			if (callback) callback.call(self, {});
		});
	},

	filterOptions: function filterOptions(options, values) {
		if (!this.props.searchable) {
			return options;
		}

		var filterValue = this._optionsFilterString;
		var exclude = (values || this.state.values).map(function (i) {
			return i.value;
		});
		if (this.props.filterOptions) {
			return this.props.filterOptions.call(this, options, filterValue, exclude);
		} else {
			var filterOption = function filterOption(op) {
				if (this.props.multi && exclude.indexOf(op.value) > -1) return false;
				if (this.props.filterOption) return this.props.filterOption.call(this, op, filterValue);
				var valueTest = String(op.value),
				    labelTest = String(op.label);
				if (this.props.ignoreCase) {
					valueTest = valueTest.toLowerCase();
					labelTest = labelTest.toLowerCase();
					filterValue = filterValue.toLowerCase();
				}
				return !filterValue || this.props.matchPos === 'start' ? this.props.matchProp !== 'label' && valueTest.substr(0, filterValue.length) === filterValue || this.props.matchProp !== 'value' && labelTest.substr(0, filterValue.length) === filterValue : this.props.matchProp !== 'label' && valueTest.indexOf(filterValue) >= 0 || this.props.matchProp !== 'value' && labelTest.indexOf(filterValue) >= 0;
			};
			return (options || []).filter(filterOption, this);
		}
	},

	selectFocusedOption: function selectFocusedOption() {
		if (this.props.allowCreate && !this.state.focusedOption) {
			return this.selectValue(this.state.inputValue);
		}
		return this.selectValue(this.state.focusedOption);
	},

	focusOption: function focusOption(op) {
		this.setState({
			focusedOption: op
		});
	},

	focusNextOption: function focusNextOption() {
		this.focusAdjacentOption('next');
	},

	focusPreviousOption: function focusPreviousOption() {
		this.focusAdjacentOption('previous');
	},

	focusAdjacentOption: function focusAdjacentOption(dir) {
		this._focusedOptionReveal = true;

		var ops = this.state.filteredOptions;

		if (!this.state.isOpen) {
			this.setState({
				isOpen: true,
				inputValue: '',
				focusedOption: this.state.focusedOption || ops[dir === 'next' ? 0 : ops.length - 1]
			}, this._bindCloseMenuIfClickedOutside);
			return;
		}

		if (!ops.length) {
			return;
		}

		var focusedIndex = -1;

		for (var i = 0; i < ops.length; i++) {
			if (this.state.focusedOption === ops[i]) {
				focusedIndex = i;
				break;
			}
		}

		var focusedOption = ops[0];

		if (dir === 'next' && focusedIndex > -1 && focusedIndex < ops.length - 1) {
			focusedOption = ops[focusedIndex + 1];
		} else if (dir === 'previous') {
			if (focusedIndex > 0) {
				focusedOption = ops[focusedIndex - 1];
			} else {
				focusedOption = ops[ops.length - 1];
			}
		}

		this.setState({
			focusedOption: focusedOption
		});
	},

	unfocusOption: function unfocusOption(op) {
		if (this.state.focusedOption === op) {
			this.setState({
				focusedOption: null
			});
		}
	},

	buildMenu: function buildMenu() {
		var focusedValue = this.state.focusedOption ? this.state.focusedOption.value : null;

		if (this.state.filteredOptions.length > 0) {
			focusedValue = focusedValue == null ? this.state.filteredOptions[0] : focusedValue;
		}

		var ops = Object.keys(this.state.filteredOptions).map(function (key) {
			var op = this.state.filteredOptions[key];
			var isFocused = focusedValue === op.value;

			var optionClass = classes({
				'Select-option': true,
				'is-focused': isFocused,
				'is-disabled': op.disabled
			});

			var ref = isFocused ? 'focused' : null;

			var mouseEnter = this.focusOption.bind(this, op);
			var mouseLeave = this.unfocusOption.bind(this, op);
			var mouseDown = this.selectValue.bind(this, op);

			if (op.disabled) {
				return React.createElement(
					'div',
					{ ref: ref, key: 'option-' + op.value, className: optionClass },
					op.label
				);
			} else {
				return React.createElement(
					'div',
					{ ref: ref, key: 'option-' + op.value,
						className: optionClass,
						onMouseEnter: mouseEnter,
						onMouseLeave: mouseLeave,
						onMouseDown: mouseDown,
						onClick: mouseDown },
					op.label
				);
			}
		}, this);

		return ops.length ? ops : React.createElement(
			'div',
			{ className: 'Select-noresults' },
			this.props.asyncOptions && !this.state.inputValue ? this.props.searchPromptText : this.props.noResultsText
		);
	},

	handleOptionLabelClick: function handleOptionLabelClick(value, event) {
		var handler = this.props.onOptionLabelClick;

		if (handler) {
			handler(value, event);
		}
	},

	render: function render() {
		var selectClass = classes('Select', this.props.className, {
			'is-multi': this.props.multi,
			'is-searchable': this.props.searchable,
			'is-open': this.state.isOpen,
			'is-focused': this.state.isFocused,
			'is-loading': this.state.isLoading,
			'is-disabled': this.props.disabled,
			'has-value': this.state.value
		});

		var value = [];

		if (this.props.multi) {
			this.state.values.forEach(function (val) {
				var props = {
					key: val.value,
					optionLabelClick: !!this.props.onOptionLabelClick,
					onOptionLabelClick: this.handleOptionLabelClick.bind(this, val),
					onRemove: this.removeValue.bind(this, val)
				};
				for (var key in val) {
					if (val.hasOwnProperty(key)) {
						props[key] = val[key];
					}
				}
				value.push(React.createElement(Value, props));
			}, this);
		}

		if (!this.props.isFocused && (this.props.disabled || !this.state.inputValue && (!this.props.multi || !value.length))) {
			value.push(React.createElement(
				'div',
				{ className: 'Select-placeholder', key: 'placeholder' },
				this.state.placeholder
			));
		}

		var loading = this.state.isLoading ? React.createElement('span', { className: 'Select-loading', 'aria-hidden': 'true' }) : null;
		var clear = this.props.clearable && this.state.value && !this.props.disabled ? React.createElement('span', { className: 'Select-clear', title: this.props.multi ? this.props.clearAllText : this.props.clearValueText, 'aria-label': this.props.multi ? this.props.clearAllText : this.props.clearValueText, onMouseDown: this.clearValue, onClick: this.clearValue, dangerouslySetInnerHTML: { __html: '&times;' } }) : null;

		var menu;
		var menuProps;
		if (this.state.isOpen) {
			menuProps = {
				ref: 'menu',
				className: 'Select-menu'
			};
			if (this.props.multi) {
				menuProps.onMouseDown = this.handleMouseDown;
			}
			menu = React.createElement(
				'div',
				{ ref: 'selectMenuContainer', className: 'Select-menu-outer' },
				React.createElement(
					'div',
					menuProps,
					this.buildMenu()
				)
			);
		}

		var input;
		var inputProps = {
			ref: 'input',
			className: 'Select-input',
			tabIndex: this.props.tabIndex || 0,
			onFocus: this.handleInputFocus,
			onBlur: this.handleInputBlur
		};
		for (var key in this.props.inputProps) {
			if (this.props.inputProps.hasOwnProperty(key)) {
				inputProps[key] = this.props.inputProps[key];
			}
		}

		if (this.props.searchable && !this.props.disabled) {
			input = React.createElement(Input, _extends({ value: this.state.inputValue, onChange: this.handleInputChange, minWidth: '5' }, inputProps));
		} else {
			input = React.createElement(
				'div',
				inputProps,
				' '
			);
		}

		return React.createElement(
			'div',
			{ ref: 'wrapper', className: selectClass },
			React.createElement('input', { type: 'hidden', ref: 'value', name: this.props.name, value: this.state.value, disabled: this.props.disabled }),
			React.createElement(
				'div',
				{ className: 'Select-control', ref: 'control', onKeyDown: this.handleKeyDown, onMouseDown: this.handleMouseDown, onTouchEnd: this.handleMouseDown },
				value,
				input,
				React.createElement('span', { className: 'Select-arrow-zone', onMouseDown: this.handleMouseDownOnArrow }),
				React.createElement('span', { className: 'Select-arrow', onMouseDown: this.handleMouseDownOnArrow }),
				loading,
				clear
			),
			menu
		);
	}

});

module.exports = Select;

},{"./Value":1,"classnames":undefined,"react":undefined,"react-input-autosize":undefined}]},{},[])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9yZWFjdC1jb21wb25lbnQtZ3VscC10YXNrcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvZ3VnZ3UvV29yay9yZWFjdC1zZWxlY3Qvc3JjL1ZhbHVlLmpzIiwiL2hvbWUvZ3VnZ3UvV29yay9yZWFjdC1zZWxlY3Qvc3JjL1NlbGVjdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUEsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUU3QixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDOztBQUU5QixZQUFXLEVBQUUsT0FBTzs7QUFFcEIsVUFBUyxFQUFFO0FBQ1YsT0FBSyxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDeEMsb0JBQWtCLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJO0FBQ3hDLFVBQVEsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUk7QUFDOUIsa0JBQWdCLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJO0VBQ3RDOztBQUVELFdBQVUsRUFBRSxvQkFBUyxLQUFLLEVBQUU7QUFDM0IsT0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO0VBQ3hCOztBQUVELE9BQU0sRUFBRSxrQkFBVztBQUNsQixNQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQzs7QUFFN0IsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFO0FBQ2hDLFFBQUssR0FDSjs7TUFBRyxTQUFTLEVBQUMsc0JBQXNCO0FBQ2xDLGdCQUFXLEVBQUUsSUFBSSxDQUFDLFVBQVUsQUFBQztBQUM3QixlQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQUFBQztBQUMxQyxZQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQUFBQztJQUN0QyxLQUFLO0lBQ0gsQUFDSixDQUFDO0dBQ0Y7O0FBRUQsU0FDQzs7S0FBSyxTQUFTLEVBQUMsYUFBYTtHQUMzQjs7TUFBTSxTQUFTLEVBQUMsa0JBQWtCO0FBQ2pDLGdCQUFXLEVBQUUsSUFBSSxDQUFDLFVBQVUsQUFBQztBQUM3QixZQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEFBQUM7QUFDN0IsZUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxBQUFDOztJQUFlO0dBQ2hEOztNQUFNLFNBQVMsRUFBQyxtQkFBbUI7SUFBRSxLQUFLO0lBQVE7R0FDN0MsQ0FDTDtFQUNGOztDQUVELENBQUMsQ0FBQzs7QUFFSCxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7QUN4Q3hCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUM1QyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDcEMsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUUvQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7O0FBRWxCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7O0FBRTlCLFlBQVcsRUFBRSxRQUFROztBQUVyQixVQUFTLEVBQUU7QUFDVixPQUFLLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHO0FBQzFCLE9BQUssRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUk7QUFDM0IsVUFBUSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUM5QixTQUFPLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLO0FBQzlCLFdBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDakMsY0FBWSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUNsQyxVQUFRLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJO0FBQzlCLGFBQVcsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDbkMsZUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTTtBQUNyQyxXQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJO0FBQy9CLGdCQUFjLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNO0FBQ3RDLGNBQVksRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDcEMsWUFBVSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUNoQyxrQkFBZ0IsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDeEMsTUFBSSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTTtBQUM1QixVQUFRLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJO0FBQzlCLFNBQU8sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUk7QUFDN0IsUUFBTSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUM1QixXQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNO0FBQ2pDLGNBQVksRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUk7QUFDbEMsZUFBYSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUNuQyxVQUFRLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNO0FBQ2hDLFdBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDakMsWUFBVSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtBQUNoQyxZQUFVLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNO0FBQ2xDLGFBQVcsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUk7Ozs7Ozs7O0FBUWpDLG9CQUFrQixFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSTtFQUN4Qzs7QUFFRCxnQkFBZSxFQUFFLDJCQUFXO0FBQzNCLFNBQU87QUFDTixRQUFLLEVBQUUsU0FBUztBQUNoQixVQUFPLEVBQUUsU0FBUztBQUNsQixXQUFRLEVBQUUsS0FBSztBQUNmLFlBQVMsRUFBRSxHQUFHO0FBQ2QsZUFBWSxFQUFFLFNBQVM7QUFDdkIsV0FBUSxFQUFFLElBQUk7QUFDZCxjQUFXLEVBQUUsV0FBVztBQUN4QixnQkFBYSxFQUFFLGtCQUFrQjtBQUNqQyxZQUFTLEVBQUUsSUFBSTtBQUNmLGlCQUFjLEVBQUUsYUFBYTtBQUM3QixlQUFZLEVBQUUsV0FBVztBQUN6QixhQUFVLEVBQUUsSUFBSTtBQUNoQixtQkFBZ0IsRUFBRSxnQkFBZ0I7QUFDbEMsT0FBSSxFQUFFLFNBQVM7QUFDZixXQUFRLEVBQUUsU0FBUztBQUNuQixZQUFTLEVBQUUsU0FBUztBQUNwQixXQUFRLEVBQUUsS0FBSztBQUNmLFlBQVMsRUFBRSxLQUFLO0FBQ2hCLGFBQVUsRUFBRSxJQUFJO0FBQ2hCLGFBQVUsRUFBRSxFQUFFO0FBQ2QsY0FBVyxFQUFFLEtBQUs7O0FBRWxCLHFCQUFrQixFQUFFLFNBQVM7R0FDN0IsQ0FBQztFQUNGOztBQUVELGdCQUFlLEVBQUUsMkJBQVc7QUFDM0IsU0FBTzs7Ozs7Ozs7OztBQVVOLFVBQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU87QUFDM0IsWUFBUyxFQUFFLEtBQUs7QUFDaEIsU0FBTSxFQUFFLEtBQUs7QUFDYixZQUFTLEVBQUUsS0FBSztHQUNoQixDQUFDO0VBQ0Y7O0FBRUQsbUJBQWtCLEVBQUUsOEJBQVc7QUFDOUIsTUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7QUFDeEIsTUFBSSxDQUFDLG9CQUFvQixHQUFHLEVBQUUsQ0FBQzs7QUFHL0IsTUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLE1BQUksQ0FBQywwQkFBMEIsR0FBRyxVQUFTLEtBQUssRUFBRTtBQUNqRCxPQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDdkIsV0FBTztJQUNQO0FBQ0QsT0FBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUMxRCxPQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQzs7QUFFakQsT0FBSSx1QkFBdUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFFLE9BQUksMEJBQTBCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQzs7O0FBR2hGLE9BQUksdUJBQXVCLElBQUksMEJBQTBCLEVBQUU7QUFDMUQsUUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLFdBQU0sRUFBRSxLQUFLO0tBQ2IsRUFBRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztJQUMxQztHQUNELENBQUM7O0FBRUYsTUFBSSxDQUFDLDhCQUE4QixHQUFHLFlBQVc7QUFDaEQsT0FBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFO0FBQ3ZELFlBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ2pFLE1BQU07QUFDTixZQUFRLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3BFO0dBQ0QsQ0FBQzs7QUFFRixNQUFJLENBQUMsZ0NBQWdDLEdBQUcsWUFBVztBQUNsRCxPQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUU7QUFDMUQsWUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDakUsTUFBTTtBQUNOLFlBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7SUFDdkU7R0FDRCxDQUFDOztBQUVGLE1BQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsWUFBVTs7QUFFakUsT0FBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtBQUNuRCxRQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM1QjtHQUNDLENBQUMsQ0FBQztFQUNMOztBQUVELHFCQUFvQixFQUFFLGdDQUFXO0FBQ2hDLGNBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDaEMsY0FBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFFakMsTUFBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtBQUNyQixPQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztHQUN4QztFQUNEOztBQUVELDBCQUF5QixFQUFFLG1DQUFTLFFBQVEsRUFBRTtBQUM3QyxNQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUM1RSxPQUFJLENBQUMsUUFBUSxDQUFDO0FBQ2IsV0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO0FBQ3pCLG1CQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQ3JELENBQUMsQ0FBQztHQUNIO0FBQ0QsTUFBSSxRQUFRLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO0FBQ3hDLE9BQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7R0FDeEU7RUFDRDs7QUFFRCxtQkFBa0IsRUFBRSw4QkFBVztBQUM5QixNQUFJLElBQUksR0FBRyxJQUFJLENBQUM7O0FBRWhCLE1BQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7QUFDbkQsZUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQzs7QUFFaEMsT0FBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsWUFBVztBQUMxQyxRQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDNUIsUUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUMvQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQ1A7O0FBRUQsTUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUU7QUFDOUIsT0FBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtBQUN4QyxRQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUNoRCxRQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUMxQyxRQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMscUJBQXFCLEVBQUUsQ0FBQztBQUNyRCxRQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQzs7QUFFL0MsUUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLElBQ3ZDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRTtBQUNoQyxZQUFPLENBQUMsU0FBUyxHQUFJLFVBQVUsQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxBQUFDLENBQUM7S0FDNUY7SUFDRDs7QUFFRCxPQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0dBQ2xDO0VBQ0Q7O0FBRUQsTUFBSyxFQUFFLGlCQUFXO0FBQ2pCLE1BQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUM1Qjs7QUFFRCxzQkFBcUIsRUFBRSwrQkFBUyxPQUFPLEVBQUUsS0FBSyxFQUFFO0FBQy9DLE1BQUksV0FBVyxHQUFHLEFBQUMsS0FBSyxDQUFDLE1BQU0sR0FBSSxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7QUFDbkUsU0FBTyxXQUFXLElBQUksSUFBSSxFQUFFO0FBQzNCLE9BQUksV0FBVyxLQUFLLE9BQU8sRUFBRSxPQUFPLEtBQUssQ0FBQztBQUMxQyxjQUFXLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQztHQUN2QztBQUNELFNBQU8sSUFBSSxDQUFDO0VBQ1o7O0FBRUQsa0JBQWlCLEVBQUUsMkJBQVMsS0FBSyxFQUFFLE9BQU8sRUFBRTtBQUMzQyxNQUFJLENBQUMsT0FBTyxFQUFFO0FBQ2IsVUFBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0dBQzdCOzs7QUFHRCxNQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7QUFDakUsT0FBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFTLENBQUMsRUFBRTtBQUFDLFdBQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUE7SUFBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUNqRixRQUFJLENBQUMsb0JBQW9CLEdBQUcsRUFBRSxDQUFDO0lBQy9CLE1BQU07QUFDTixRQUFJLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0lBQ2xDO0dBQ0QsTUFBTTtBQUNOLE9BQUksQ0FBQyxvQkFBb0IsR0FBRyxFQUFFLENBQUM7R0FDL0I7O0FBRUQsTUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO01BQ2hELGVBQWUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQzs7QUFFdkQsU0FBTztBQUNOLFFBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFFO0FBQUUsV0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztBQUM3RSxTQUFNLEVBQUUsTUFBTTtBQUNkLGFBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CO0FBQ3JDLGtCQUFlLEVBQUUsZUFBZTtBQUNoQyxjQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXO0FBQzFGLGdCQUFhLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDO0dBQ2xGLENBQUM7RUFDRjs7QUFFRCxnQkFBZSxFQUFFLHlCQUFTLE1BQU0sRUFBRSxPQUFPLEVBQUU7QUFDMUMsTUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDM0IsT0FBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUU7QUFDL0IsVUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM1QyxNQUFNO0FBQ04sVUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNoQztHQUNEOztBQUVELFNBQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFTLEdBQUcsRUFBRTtBQUMvQixPQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtBQUM1QixTQUFLLElBQUksR0FBRyxJQUFJLE9BQU8sRUFBRTtBQUN4QixTQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEtBQUssR0FBRyxFQUFFO0FBQzlFLGFBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO01BQ3BCO0tBQ0Q7QUFDRCxXQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDbEMsTUFBTTtBQUNOLFdBQU8sR0FBRyxDQUFDO0lBQ1g7R0FDRCxDQUFDLENBQUM7RUFDSDs7QUFFRCxTQUFRLEVBQUUsa0JBQVMsS0FBSyxFQUFFLGdCQUFnQixFQUFFO0FBQzNDLE1BQUksZ0JBQWdCLElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFO0FBQ3ZELE9BQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7R0FDOUI7QUFDRCxNQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0MsVUFBUSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDeEIsTUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixNQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ3hCOztBQUVELFlBQVcsRUFBRSxxQkFBUyxLQUFLLEVBQUU7QUFDNUIsTUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFO0FBQ3RCLE9BQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDckIsTUFBTSxJQUFJLEtBQUssRUFBRTtBQUNqQixPQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0dBQ3JCO0FBQ0QsTUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUM7RUFDeEM7O0FBRUQsU0FBUSxFQUFFLGtCQUFTLEtBQUssRUFBRTtBQUN6QixNQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0VBQy9DOztBQUVELFNBQVEsRUFBRSxvQkFBVztBQUNwQixNQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDeEU7O0FBRUQsWUFBVyxFQUFFLHFCQUFTLGFBQWEsRUFBRTtBQUNwQyxNQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFTLEtBQUssRUFBRTtBQUN0RCxVQUFPLEtBQUssS0FBSyxhQUFhLENBQUM7R0FDL0IsQ0FBQyxDQUFDLENBQUM7RUFDSjs7QUFFRCxXQUFVLEVBQUUsb0JBQVMsS0FBSyxFQUFFOzs7QUFHM0IsTUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxXQUFXLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDOUQsVUFBTztHQUNQO0FBQ0QsT0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQ3hCLE9BQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUN2QixNQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3BCOztBQUVELFdBQVUsRUFBRSxzQkFBVztBQUN0QixNQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNqRTs7QUFFRCxhQUFZLEVBQUUsd0JBQVk7QUFDekIsTUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDNUIsU0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDO0VBQzFEOztBQUVELGdCQUFlLEVBQUUseUJBQVMsUUFBUSxFQUFFO0FBQ25DLE1BQUksUUFBUSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtBQUMvRCxPQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUNyRDtFQUNEOztBQUVELGdCQUFlLEVBQUUseUJBQVMsS0FBSyxFQUFFOzs7QUFHaEMsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSyxLQUFLLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsQUFBQyxFQUFFO0FBQzlFLFVBQU87R0FDUDs7QUFFRCxPQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDeEIsT0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQ3ZCLE1BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUU7QUFDekIsT0FBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLFVBQU0sRUFBRSxJQUFJO0lBQ1osRUFBRSxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztHQUN4QyxNQUFNO0FBQ04sT0FBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7QUFDNUIsT0FBSSxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0dBQzVCO0VBQ0Q7O0FBRUQsdUJBQXNCLEVBQUUsZ0NBQVMsS0FBSyxFQUFFOzs7QUFHdkMsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSyxLQUFLLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsQUFBQyxFQUFFO0FBQzlFLFVBQU87R0FDUDs7QUFFRCxNQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDdkIsVUFBTztHQUNQOztBQUVELE9BQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUN4QixPQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDdkIsTUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLFNBQU0sRUFBRSxLQUFLO0dBQ2IsRUFBRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztFQUMxQzs7QUFFRCxpQkFBZ0IsRUFBRSwwQkFBUyxLQUFLLEVBQUU7QUFDakMsTUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQztBQUMxRCxNQUFJLENBQUMsUUFBUSxDQUFDO0FBQ2IsYUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSztBQUM1QixZQUFTLEVBQUUsSUFBSTtBQUNmLFNBQU0sRUFBRSxTQUFTO0dBQ2pCLEVBQUUsWUFBVztBQUNiLE9BQUcsU0FBUyxFQUFFO0FBQ2IsUUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7SUFDdEMsTUFDSTtBQUNKLFFBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO0lBQ3hDO0dBQ0QsQ0FBQyxDQUFDO0FBQ0gsTUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7O0FBRTdCLE1BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7QUFDdkIsT0FBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDMUI7RUFDRDs7QUFFRCxnQkFBZSxFQUFFLHlCQUFTLEtBQUssRUFBRTtBQUNoQyxNQUFJLElBQUksR0FBRyxJQUFJLENBQUM7O0FBRWhCLE1BQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLFlBQVc7QUFDekMsT0FBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsT0FBTzs7QUFFbkMsT0FBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLGFBQVMsRUFBRSxLQUFLO0lBQ2hCLENBQUMsQ0FBQztHQUNILEVBQUUsRUFBRSxDQUFDLENBQUM7O0FBRVAsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtBQUN0QixPQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUN6QjtFQUNEOztBQUVELGNBQWEsRUFBRSx1QkFBUyxLQUFLLEVBQUU7QUFDOUIsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxPQUFPOztBQUVoQyxVQUFRLEtBQUssQ0FBQyxPQUFPOztBQUVwQixRQUFLLENBQUM7O0FBQ0wsUUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFO0FBQzNCLFNBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztLQUNoQjtBQUNGLFdBQU87O0FBQUEsQUFFUCxRQUFLLENBQUM7O0FBQ0wsUUFBSSxLQUFLLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRTtBQUN0RSxZQUFPO0tBQ1A7QUFDRCxRQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztBQUM1QixVQUFNOztBQUFBLEFBRU4sUUFBSyxFQUFFOztBQUNOLFFBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPOztBQUUvQixRQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztBQUM1QixVQUFNOztBQUFBLEFBRU4sUUFBSyxFQUFFOztBQUNOLFFBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDdEIsU0FBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0tBQ2xCLE1BQU07QUFDTixTQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7S0FDbEI7QUFDRixVQUFNOztBQUFBLEFBRU4sUUFBSyxFQUFFOztBQUNOLFFBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBQzVCLFVBQU07O0FBQUEsQUFFTixRQUFLLEVBQUU7O0FBQ04sUUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQ3hCLFVBQU07O0FBQUEsQUFFTixRQUFLLEdBQUc7O0FBQ1AsV0FBTztBQUNQLFVBQU07QUFDUCxVQUFNOztBQUFBLEFBRU47QUFBUyxXQUFPO0FBQUEsR0FDaEI7O0FBRUQsT0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO0VBQ3ZCOzs7O0FBSUQscUJBQW9CLEVBQUUsOEJBQVMsZUFBZSxFQUFFO0FBQy9DLE9BQUssSUFBSSxHQUFHLElBQUksZUFBZSxFQUFFO0FBQ2hDLE9BQUksZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUU7QUFDN0YsV0FBTyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUI7R0FDRDtBQUNELFNBQU8sZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFCOztBQUVELGtCQUFpQixFQUFFLDJCQUFTLEtBQUssRUFBRTs7O0FBR2xDLE1BQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQzs7QUFFL0MsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRTtBQUM1QixPQUFJLENBQUMsUUFBUSxDQUFDO0FBQ2IsYUFBUyxFQUFFLElBQUk7QUFDZixjQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0lBQzlCLENBQUMsQ0FBQztBQUNILE9BQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRTtBQUN6QyxhQUFTLEVBQUUsS0FBSztBQUNoQixVQUFNLEVBQUUsSUFBSTtJQUNaLEVBQUUsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7R0FDeEMsTUFBTTtBQUNOLE9BQUksZUFBZSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3RCxPQUFJLENBQUMsUUFBUSxDQUFDO0FBQ2IsVUFBTSxFQUFFLElBQUk7QUFDWixjQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQzlCLG1CQUFlLEVBQUUsZUFBZTtBQUNoQyxpQkFBYSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUM7SUFDekQsRUFBRSxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztHQUN4QztFQUNEOztBQUVELHFCQUFvQixFQUFFLGdDQUFXO0FBQ2hDLE1BQUksSUFBSSxHQUFHLElBQUksQ0FBQztBQUNoQixNQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxZQUFZOztBQUV6QyxPQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0dBQ3ZDLENBQUMsQ0FBQztFQUNIOztBQUVELGlCQUFnQixFQUFFLDBCQUFTLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ2xELE1BQUksYUFBYSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLEVBQUUsQ0FBQzs7QUFFekQsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDdkMsT0FBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDakMsT0FBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEtBQUssS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUEsQUFBQyxFQUFFO0FBQ2xHLFFBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ25ELFFBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRWxELFFBQUksUUFBUSxHQUFHO0FBQ2QsWUFBTyxFQUFFLE9BQU87QUFDaEIsb0JBQWUsRUFBRSxlQUFlO0FBQ2hDLGtCQUFhLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGVBQWUsQ0FBQztLQUN6RCxDQUFDO0FBQ0YsU0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLEVBQUU7QUFDdEIsU0FBSSxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzlCLGNBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7TUFDM0I7S0FDRDtBQUNELFFBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEIsUUFBRyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDckMsV0FBTztJQUNQO0dBQ0Q7O0FBRUQsTUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLE1BQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxVQUFTLEdBQUcsRUFBRSxJQUFJLEVBQUU7O0FBRWxELE9BQUksR0FBRyxFQUFFLE1BQU0sR0FBRyxDQUFDOztBQUVuQixPQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQzs7QUFFakMsT0FBSSxhQUFhLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFO0FBQzdDLFdBQU87SUFDUDtBQUNELE9BQUksZUFBZSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOztBQUV2RCxPQUFJLFFBQVEsR0FBRztBQUNkLFdBQU8sRUFBRSxJQUFJLENBQUMsT0FBTztBQUNyQixtQkFBZSxFQUFFLGVBQWU7QUFDaEMsaUJBQWEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDO0lBQ3pELENBQUM7QUFDRixRQUFLLElBQUksR0FBRyxJQUFJLEtBQUssRUFBRTtBQUN0QixRQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDOUIsYUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUMzQjtJQUNEO0FBQ0QsT0FBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7QUFFeEIsT0FBRyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7R0FFckMsQ0FBQyxDQUFDO0VBQ0g7O0FBRUQsY0FBYSxFQUFFLHVCQUFTLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDeEMsTUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFO0FBQzNCLFVBQU8sT0FBTyxDQUFDO0dBQ2Y7O0FBRUQsTUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDO0FBQzVDLE1BQUksT0FBTyxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFBLENBQUUsR0FBRyxDQUFDLFVBQVMsQ0FBQyxFQUFFO0FBQzNELFVBQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQztHQUNmLENBQUMsQ0FBQztBQUNILE1BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUU7QUFDN0IsVUFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDMUUsTUFBTTtBQUNOLE9BQUksWUFBWSxHQUFHLFNBQWYsWUFBWSxDQUFZLEVBQUUsRUFBRTtBQUMvQixRQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBQ3JFLFFBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUN4RixRQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQztRQUFFLFNBQVMsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQy9ELFFBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUU7QUFDMUIsY0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNwQyxjQUFTLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3BDLGdCQUFXLEdBQUcsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0tBQ3hDO0FBQ0QsV0FBTyxDQUFDLFdBQVcsSUFBSyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsS0FBSyxPQUFPLEFBQUMsR0FDdkQsQUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxPQUFPLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLFdBQVcsSUFDM0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEtBQUssT0FBTyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxXQUFXLEFBQUMsR0FFN0YsQUFBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxPQUFPLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQ3ZFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxLQUFLLE9BQU8sSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQUFBQyxBQUN6RSxDQUFDO0lBQ0YsQ0FBQztBQUNGLFVBQU8sQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFBLENBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztHQUNsRDtFQUNEOztBQUVELG9CQUFtQixFQUFFLCtCQUFXO0FBQy9CLE1BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRTtBQUN4RCxVQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztHQUMvQztBQUNELFNBQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0VBQ2xEOztBQUVELFlBQVcsRUFBRSxxQkFBUyxFQUFFLEVBQUU7QUFDekIsTUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLGdCQUFhLEVBQUUsRUFBRTtHQUNqQixDQUFDLENBQUM7RUFDSDs7QUFFRCxnQkFBZSxFQUFFLDJCQUFXO0FBQzNCLE1BQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUNqQzs7QUFFRCxvQkFBbUIsRUFBRSwrQkFBVztBQUMvQixNQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7RUFDckM7O0FBRUQsb0JBQW1CLEVBQUUsNkJBQVMsR0FBRyxFQUFFO0FBQ2xDLE1BQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUM7O0FBRWpDLE1BQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDOztBQUVyQyxNQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDdkIsT0FBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLFVBQU0sRUFBRSxJQUFJO0FBQ1osY0FBVSxFQUFFLEVBQUU7QUFDZCxpQkFBYSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssTUFBTSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNuRixFQUFFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQ3hDLFVBQU87R0FDUDs7QUFFRCxNQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtBQUNoQixVQUFPO0dBQ1A7O0FBRUQsTUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7O0FBRXRCLE9BQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3BDLE9BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3hDLGdCQUFZLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCLFVBQU07SUFDTjtHQUNEOztBQUVELE1BQUksYUFBYSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFM0IsTUFBSSxHQUFHLEtBQUssTUFBTSxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUMsSUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDekUsZ0JBQWEsR0FBRyxHQUFHLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDO0dBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO0FBQzlCLE9BQUksWUFBWSxHQUFHLENBQUMsRUFBRTtBQUNyQixpQkFBYSxHQUFHLEdBQUcsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEMsTUFBTTtBQUNOLGlCQUFhLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEM7R0FDRDs7QUFFRCxNQUFJLENBQUMsUUFBUSxDQUFDO0FBQ2IsZ0JBQWEsRUFBRSxhQUFhO0dBQzVCLENBQUMsQ0FBQztFQUVIOztBQUVELGNBQWEsRUFBRSx1QkFBUyxFQUFFLEVBQUU7QUFDM0IsTUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsS0FBSyxFQUFFLEVBQUU7QUFDcEMsT0FBSSxDQUFDLFFBQVEsQ0FBQztBQUNiLGlCQUFhLEVBQUUsSUFBSTtJQUNuQixDQUFDLENBQUM7R0FDSDtFQUNEOztBQUVELFVBQVMsRUFBRSxxQkFBVztBQUNyQixNQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDOztBQUVwRixNQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDekMsZUFBWSxHQUFHLFlBQVksSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDO0dBQ25GOztBQUVELE1BQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxHQUFHLEVBQUU7QUFDbkUsT0FBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekMsT0FBSSxTQUFTLEdBQUcsWUFBWSxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUM7O0FBRTFDLE9BQUksV0FBVyxHQUFHLE9BQU8sQ0FBQztBQUN6QixtQkFBZSxFQUFFLElBQUk7QUFDckIsZ0JBQVksRUFBRSxTQUFTO0FBQ3ZCLGlCQUFhLEVBQUUsRUFBRSxDQUFDLFFBQVE7SUFDMUIsQ0FBQyxDQUFDOztBQUVILE9BQUksR0FBRyxHQUFHLFNBQVMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDOztBQUV2QyxPQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDakQsT0FBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ25ELE9BQUksU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQzs7QUFFaEQsT0FBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0FBQ2hCLFdBQU87O09BQUssR0FBRyxFQUFFLEdBQUcsQUFBQyxFQUFDLEdBQUcsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLEtBQUssQUFBQyxFQUFDLFNBQVMsRUFBRSxXQUFXLEFBQUM7S0FBRSxFQUFFLENBQUMsS0FBSztLQUFPLENBQUM7SUFDMUYsTUFBTTtBQUNOLFdBQU87O09BQUssR0FBRyxFQUFFLEdBQUcsQUFBQyxFQUFDLEdBQUcsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFDLEtBQUssQUFBQztBQUMvQyxlQUFTLEVBQUUsV0FBVyxBQUFDO0FBQ3ZCLGtCQUFZLEVBQUUsVUFBVSxBQUFDO0FBQ3pCLGtCQUFZLEVBQUUsVUFBVSxBQUFDO0FBQ3pCLGlCQUFXLEVBQUUsU0FBUyxBQUFDO0FBQ3ZCLGFBQU8sRUFBRSxTQUFTLEFBQUM7S0FDakIsRUFBRSxDQUFDLEtBQUs7S0FDSixDQUFDO0lBQ1I7R0FDRCxFQUFFLElBQUksQ0FBQyxDQUFDOztBQUVULFNBQU8sR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQ3RCOztLQUFLLFNBQVMsRUFBQyxrQkFBa0I7R0FDL0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYTtHQUN0RyxBQUNOLENBQUM7RUFDRjs7QUFFRCx1QkFBc0IsRUFBRSxnQ0FBVSxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQy9DLE1BQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUM7O0FBRTVDLE1BQUksT0FBTyxFQUFFO0FBQ1osVUFBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztHQUN0QjtFQUNEOztBQUVELE9BQU0sRUFBRSxrQkFBVztBQUNsQixNQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFO0FBQ3pELGFBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUs7QUFDNUIsa0JBQWUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVU7QUFDdEMsWUFBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtBQUM1QixlQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTO0FBQ2xDLGVBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVM7QUFDbEMsZ0JBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVE7QUFDbEMsY0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSztHQUM3QixDQUFDLENBQUM7O0FBRUgsTUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDOztBQUVmLE1BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7QUFDckIsT0FBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVMsR0FBRyxFQUFFO0FBQ3ZDLFFBQUksS0FBSyxHQUFHO0FBQ1gsUUFBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLO0FBQ2QscUJBQWdCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCO0FBQ2pELHVCQUFrQixFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztBQUMvRCxhQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQztLQUMxQyxDQUFDO0FBQ0YsU0FBSyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUU7QUFDcEIsU0FBSSxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzVCLFdBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7TUFDdEI7S0FDRDtBQUNELFNBQUssQ0FBQyxJQUFJLENBQUMsb0JBQUMsS0FBSyxFQUFLLEtBQUssQ0FBSSxDQUFDLENBQUM7SUFDakMsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUNUOztBQUVELE1BQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFBLEFBQUMsQ0FBQyxBQUFDLEVBQUU7QUFDdkgsUUFBSyxDQUFDLElBQUksQ0FBQzs7TUFBSyxTQUFTLEVBQUMsb0JBQW9CLEVBQUMsR0FBRyxFQUFDLGFBQWE7SUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVc7SUFBTyxDQUFDLENBQUM7R0FDakc7O0FBRUQsTUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsOEJBQU0sU0FBUyxFQUFDLGdCQUFnQixFQUFDLGVBQVksTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDO0FBQ25HLE1BQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsOEJBQU0sU0FBUyxFQUFDLGNBQWMsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEFBQUMsRUFBQyxjQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxBQUFDLEVBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLEFBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQUFBQyxFQUFDLHVCQUF1QixFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxBQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7O0FBRW5ZLE1BQUksSUFBSSxDQUFDO0FBQ1QsTUFBSSxTQUFTLENBQUM7QUFDZCxNQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ3RCLFlBQVMsR0FBRztBQUNYLE9BQUcsRUFBRSxNQUFNO0FBQ1gsYUFBUyxFQUFFLGFBQWE7SUFDeEIsQ0FBQztBQUNGLE9BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUU7QUFDckIsYUFBUyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzdDO0FBQ0QsT0FBSSxHQUNIOztNQUFLLEdBQUcsRUFBQyxxQkFBcUIsRUFBQyxTQUFTLEVBQUMsbUJBQW1CO0lBQzNEOztLQUFTLFNBQVM7S0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFO0tBQU87SUFDdkMsQUFDTixDQUFDO0dBQ0Y7O0FBRUQsTUFBSSxLQUFLLENBQUM7QUFDVixNQUFJLFVBQVUsR0FBRztBQUNoQixNQUFHLEVBQUUsT0FBTztBQUNaLFlBQVMsRUFBRSxjQUFjO0FBQ3pCLFdBQVEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDO0FBQ2xDLFVBQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCO0FBQzlCLFNBQU0sRUFBRSxJQUFJLENBQUMsZUFBZTtHQUM1QixDQUFDO0FBQ0YsT0FBSyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRTtBQUN0QyxPQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUM5QyxjQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDN0M7R0FDRDs7QUFFRCxNQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7QUFDbEQsUUFBSyxHQUFHLG9CQUFDLEtBQUssYUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEFBQUMsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixBQUFDLEVBQUMsUUFBUSxFQUFDLEdBQUcsSUFBSyxVQUFVLEVBQUksQ0FBQztHQUMvRyxNQUFNO0FBQ04sUUFBSyxHQUFHOztJQUFTLFVBQVU7O0lBQWMsQ0FBQztHQUMxQzs7QUFFRCxTQUNDOztLQUFLLEdBQUcsRUFBQyxTQUFTLEVBQUMsU0FBUyxFQUFFLFdBQVcsQUFBQztHQUN6QywrQkFBTyxJQUFJLEVBQUMsUUFBUSxFQUFDLEdBQUcsRUFBQyxPQUFPLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxBQUFDLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxBQUFDLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxBQUFDLEdBQUc7R0FDbEg7O01BQUssU0FBUyxFQUFDLGdCQUFnQixFQUFDLEdBQUcsRUFBQyxTQUFTLEVBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLEFBQUMsRUFBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGVBQWUsQUFBQyxFQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsZUFBZSxBQUFDO0lBQy9JLEtBQUs7SUFDTCxLQUFLO0lBQ04sOEJBQU0sU0FBUyxFQUFDLG1CQUFtQixFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEFBQUMsR0FBRztJQUNoRiw4QkFBTSxTQUFTLEVBQUMsY0FBYyxFQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEFBQUMsR0FBRztJQUMxRSxPQUFPO0lBQ1AsS0FBSztJQUNEO0dBQ0wsSUFBSTtHQUNBLENBQ0w7RUFDRjs7Q0FFRCxDQUFDLENBQUM7O0FBRUgsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcblxudmFyIE9wdGlvbiA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtcblxuXHRkaXNwbGF5TmFtZTogJ1ZhbHVlJyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHRsYWJlbDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZy5pc1JlcXVpcmVkLFxuXHRcdG9uT3B0aW9uTGFiZWxDbGljazogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdFx0b25SZW1vdmU6IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHRcdG9wdGlvbkxhYmVsQ2xpY2s6IFJlYWN0LlByb3BUeXBlcy5ib29sXG5cdH0sXG5cblx0YmxvY2tFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSxcblxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYWJlbCA9IHRoaXMucHJvcHMubGFiZWw7XG5cblx0XHRpZiAodGhpcy5wcm9wcy5vcHRpb25MYWJlbENsaWNrKSB7XG5cdFx0XHRsYWJlbCA9IChcblx0XHRcdFx0PGEgY2xhc3NOYW1lPVwiU2VsZWN0LWl0ZW0tbGFiZWxfX2FcIlxuXHRcdFx0XHRcdG9uTW91c2VEb3duPXt0aGlzLmJsb2NrRXZlbnR9XG5cdFx0XHRcdFx0b25Ub3VjaEVuZD17dGhpcy5wcm9wcy5vbk9wdGlvbkxhYmVsQ2xpY2t9XG5cdFx0XHRcdFx0b25DbGljaz17dGhpcy5wcm9wcy5vbk9wdGlvbkxhYmVsQ2xpY2t9PlxuXHRcdFx0XHRcdHtsYWJlbH1cblx0XHRcdFx0PC9hPlxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJTZWxlY3QtaXRlbVwiPlxuXHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJTZWxlY3QtaXRlbS1pY29uXCJcblx0XHRcdFx0XHRvbk1vdXNlRG93bj17dGhpcy5ibG9ja0V2ZW50fVxuXHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMucHJvcHMub25SZW1vdmV9XG5cdFx0XHRcdFx0b25Ub3VjaEVuZD17dGhpcy5wcm9wcy5vblJlbW92ZX0+JnRpbWVzOzwvc3Bhbj5cblx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiU2VsZWN0LWl0ZW0tbGFiZWxcIj57bGFiZWx9PC9zcGFuPlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcHRpb247XG4iLCIvKiBkaXNhYmxlIHNvbWUgcnVsZXMgdW50aWwgd2UgcmVmYWN0b3IgbW9yZSBjb21wbGV0ZWx5OyBmaXhpbmcgdGhlbSBub3cgd291bGRcbiAgIGNhdXNlIGNvbmZsaWN0cyB3aXRoIHNvbWUgb3BlbiBQUnMgdW5uZWNlc3NhcmlseS4gKi9cbi8qIGVzbGludCByZWFjdC9qc3gtc29ydC1wcm9wLXR5cGVzOiAwLCByZWFjdC9zb3J0LWNvbXA6IDAsIHJlYWN0L3Byb3AtdHlwZXM6IDAgKi9cblxudmFyIFJlYWN0ID0gcmVxdWlyZSgncmVhY3QnKTtcbnZhciBJbnB1dCA9IHJlcXVpcmUoJ3JlYWN0LWlucHV0LWF1dG9zaXplJyk7XG52YXIgY2xhc3NlcyA9IHJlcXVpcmUoJ2NsYXNzbmFtZXMnKTtcbnZhciBWYWx1ZSA9IHJlcXVpcmUoJy4vVmFsdWUnKTtcblxudmFyIHJlcXVlc3RJZCA9IDA7XG5cbnZhciBTZWxlY3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cblx0ZGlzcGxheU5hbWU6ICdTZWxlY3QnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdHZhbHVlOiBSZWFjdC5Qcm9wVHlwZXMuYW55LCAgICAgICAgICAgICAgICAvLyBpbml0aWFsIGZpZWxkIHZhbHVlXG5cdFx0bXVsdGk6IFJlYWN0LlByb3BUeXBlcy5ib29sLCAgICAgICAgICAgICAgIC8vIG11bHRpLXZhbHVlIGlucHV0XG5cdFx0ZGlzYWJsZWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLCAgICAgICAgICAgIC8vIHdoZXRoZXIgdGhlIFNlbGVjdCBpcyBkaXNhYmxlZCBvciBub3Rcblx0XHRvcHRpb25zOiBSZWFjdC5Qcm9wVHlwZXMuYXJyYXksICAgICAgICAgICAgLy8gYXJyYXkgb2Ygb3B0aW9uc1xuXHRcdGRlbGltaXRlcjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgICAgICAvLyBkZWxpbWl0ZXIgdG8gdXNlIHRvIGpvaW4gbXVsdGlwbGUgdmFsdWVzXG5cdFx0YXN5bmNPcHRpb25zOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgICAgICAgIC8vIGZ1bmN0aW9uIHRvIGNhbGwgdG8gZ2V0IG9wdGlvbnNcblx0XHRhdXRvbG9hZDogUmVhY3QuUHJvcFR5cGVzLmJvb2wsICAgICAgICAgICAgLy8gd2hldGhlciB0byBhdXRvLWxvYWQgdGhlIGRlZmF1bHQgYXN5bmMgb3B0aW9ucyBzZXRcblx0XHRwbGFjZWhvbGRlcjogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgICAgLy8gZmllbGQgcGxhY2Vob2xkZXIsIGRpc3BsYXllZCB3aGVuIHRoZXJlJ3Mgbm8gdmFsdWVcblx0XHRub1Jlc3VsdHNUZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAgLy8gcGxhY2Vob2xkZXIgZGlzcGxheWVkIHdoZW4gdGhlcmUgYXJlIG5vIG1hdGNoaW5nIHNlYXJjaCByZXN1bHRzXG5cdFx0Y2xlYXJhYmxlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgICAgICAgICAgIC8vIHNob3VsZCBpdCBiZSBwb3NzaWJsZSB0byByZXNldCB2YWx1ZVxuXHRcdGNsZWFyVmFsdWVUZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAvLyB0aXRsZSBmb3IgdGhlIFwiY2xlYXJcIiBjb250cm9sXG5cdFx0Y2xlYXJBbGxUZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAgIC8vIHRpdGxlIGZvciB0aGUgXCJjbGVhclwiIGNvbnRyb2wgd2hlbiBtdWx0aTogdHJ1ZVxuXHRcdHNlYXJjaGFibGU6IFJlYWN0LlByb3BUeXBlcy5ib29sLCAgICAgICAgICAvLyB3aGV0aGVyIHRvIGVuYWJsZSBzZWFyY2hpbmcgZmVhdHVyZSBvciBub3Rcblx0XHRzZWFyY2hQcm9tcHRUZXh0OiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgLy8gbGFiZWwgdG8gcHJvbXB0IGZvciBzZWFyY2ggaW5wdXRcblx0XHRuYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAgICAgICAgICAgLy8gZmllbGQgbmFtZSwgZm9yIGhpZGRlbiA8aW5wdXQgLz4gdGFnXG5cdFx0b25DaGFuZ2U6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAgICAgICAgICAgIC8vIG9uQ2hhbmdlIGhhbmRsZXI6IGZ1bmN0aW9uKG5ld1ZhbHVlKSB7fVxuXHRcdG9uRm9jdXM6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAgICAgICAgICAgICAvLyBvbkZvY3VzIGhhbmRsZXI6IGZ1bmN0aW9uKGV2ZW50KSB7fVxuXHRcdG9uQmx1cjogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsICAgICAgICAgICAgICAvLyBvbkJsdXIgaGFuZGxlcjogZnVuY3Rpb24oZXZlbnQpIHt9XG5cdFx0Y2xhc3NOYW1lOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAgICAgIC8vIGNsYXNzTmFtZSBmb3IgdGhlIG91dGVyIGVsZW1lbnRcblx0XHRmaWx0ZXJPcHRpb246IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAgICAgICAgLy8gbWV0aG9kIHRvIGZpbHRlciBhIHNpbmdsZSBvcHRpb246IGZ1bmN0aW9uKG9wdGlvbiwgZmlsdGVyU3RyaW5nKVxuXHRcdGZpbHRlck9wdGlvbnM6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAgICAgICAvLyBtZXRob2QgdG8gZmlsdGVyIHRoZSBvcHRpb25zIGFycmF5OiBmdW5jdGlvbihbb3B0aW9uc10sIGZpbHRlclN0cmluZywgW3ZhbHVlc10pXG5cdFx0bWF0Y2hQb3M6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsICAgICAgICAgIC8vIChhbnl8c3RhcnQpIG1hdGNoIHRoZSBzdGFydCBvciBlbnRpcmUgc3RyaW5nIHdoZW4gZmlsdGVyaW5nXG5cdFx0bWF0Y2hQcm9wOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAgICAgIC8vIChhbnl8bGFiZWx8dmFsdWUpIHdoaWNoIG9wdGlvbiBwcm9wZXJ0eSB0byBmaWx0ZXIgb25cblx0XHRpZ25vcmVDYXNlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgICAgICAgICAgLy8gd2hldGhlciB0byBwZXJmb3JtIGNhc2UtaW5zZW5zaXRpdmUgZmlsdGVyaW5nXG5cdFx0aW5wdXRQcm9wczogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCwgICAgICAgIC8vIGN1c3RvbSBhdHRyaWJ1dGVzIGZvciB0aGUgSW5wdXQgKGluIHRoZSBTZWxlY3QtY29udHJvbCkgZS5nOiB7J2RhdGEtZm9vJzogJ2Jhcid9XG5cdFx0YWxsb3dDcmVhdGU6IFJlYWN0LlByb3BUeXBlcy5ib29sLCAgICAgICAgIC8vIHdldGhlciB0byBhbGxvdyBjcmVhdGlvbiBvZiBuZXcgZW50cmllc1xuXHRcdC8qXG5cdFx0KiBBbGxvdyB1c2VyIHRvIG1ha2Ugb3B0aW9uIGxhYmVsIGNsaWNrYWJsZS4gV2hlbiB0aGlzIGhhbmRsZXIgaXMgZGVmaW5lZCB3ZSBzaG91bGRcblx0XHQqIHdyYXAgbGFiZWwgaW50byA8YT5sYWJlbDwvYT4gdGFnLlxuXHRcdCpcblx0XHQqIG9uT3B0aW9uTGFiZWxDbGljayBoYW5kbGVyOiBmdW5jdGlvbiAodmFsdWUsIGV2ZW50KSB7fVxuXHRcdCpcblx0XHQqL1xuXHRcdG9uT3B0aW9uTGFiZWxDbGljazogUmVhY3QuUHJvcFR5cGVzLmZ1bmNcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR2YWx1ZTogdW5kZWZpbmVkLFxuXHRcdFx0b3B0aW9uczogdW5kZWZpbmVkLFxuXHRcdFx0ZGlzYWJsZWQ6IGZhbHNlLFxuXHRcdFx0ZGVsaW1pdGVyOiAnLCcsXG5cdFx0XHRhc3luY09wdGlvbnM6IHVuZGVmaW5lZCxcblx0XHRcdGF1dG9sb2FkOiB0cnVlLFxuXHRcdFx0cGxhY2Vob2xkZXI6ICdTZWxlY3QuLi4nLFxuXHRcdFx0bm9SZXN1bHRzVGV4dDogJ05vIHJlc3VsdHMgZm91bmQnLFxuXHRcdFx0Y2xlYXJhYmxlOiB0cnVlLFxuXHRcdFx0Y2xlYXJWYWx1ZVRleHQ6ICdDbGVhciB2YWx1ZScsXG5cdFx0XHRjbGVhckFsbFRleHQ6ICdDbGVhciBhbGwnLFxuXHRcdFx0c2VhcmNoYWJsZTogdHJ1ZSxcblx0XHRcdHNlYXJjaFByb21wdFRleHQ6ICdUeXBlIHRvIHNlYXJjaCcsXG5cdFx0XHRuYW1lOiB1bmRlZmluZWQsXG5cdFx0XHRvbkNoYW5nZTogdW5kZWZpbmVkLFxuXHRcdFx0Y2xhc3NOYW1lOiB1bmRlZmluZWQsXG5cdFx0XHRtYXRjaFBvczogJ2FueScsXG5cdFx0XHRtYXRjaFByb3A6ICdhbnknLFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGlucHV0UHJvcHM6IHt9LFxuXHRcdFx0YWxsb3dDcmVhdGU6IGZhbHNlLFxuXG5cdFx0XHRvbk9wdGlvbkxhYmVsQ2xpY2s6IHVuZGVmaW5lZFxuXHRcdH07XG5cdH0sXG5cblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Lypcblx0XHRcdCAqIHNldCBieSBnZXRTdGF0ZUZyb21WYWx1ZSBvbiBjb21wb25lbnRXaWxsTW91bnQ6XG5cdFx0XHQgKiAtIHZhbHVlXG5cdFx0XHQgKiAtIHZhbHVlc1xuXHRcdFx0ICogLSBmaWx0ZXJlZE9wdGlvbnNcblx0XHRcdCAqIC0gaW5wdXRWYWx1ZVxuXHRcdFx0ICogLSBwbGFjZWhvbGRlclxuXHRcdFx0ICogLSBmb2N1c2VkT3B0aW9uXG5cdFx0XHQqL1xuXHRcdFx0b3B0aW9uczogdGhpcy5wcm9wcy5vcHRpb25zLFxuXHRcdFx0aXNGb2N1c2VkOiBmYWxzZSxcblx0XHRcdGlzT3BlbjogZmFsc2UsXG5cdFx0XHRpc0xvYWRpbmc6IGZhbHNlXG5cdFx0fTtcblx0fSxcblxuXHRjb21wb25lbnRXaWxsTW91bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX29wdGlvbnNDYWNoZSA9IHt9O1xuXHRcdHRoaXMuX29wdGlvbnNGaWx0ZXJTdHJpbmcgPSAnJztcblxuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHRoaXMuX2Nsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUgPSBmdW5jdGlvbihldmVudCkge1xuXHRcdFx0aWYgKCFzZWxmLnN0YXRlLmlzT3Blbikge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2YXIgbWVudUVsZW0gPSBzZWxmLnJlZnMuc2VsZWN0TWVudUNvbnRhaW5lci5nZXRET01Ob2RlKCk7XG5cdFx0XHR2YXIgY29udHJvbEVsZW0gPSBzZWxmLnJlZnMuY29udHJvbC5nZXRET01Ob2RlKCk7XG5cblx0XHRcdHZhciBldmVudE9jY3VyZWRPdXRzaWRlTWVudSA9IHNlbGYuY2xpY2tlZE91dHNpZGVFbGVtZW50KG1lbnVFbGVtLCBldmVudCk7XG5cdFx0XHR2YXIgZXZlbnRPY2N1cmVkT3V0c2lkZUNvbnRyb2wgPSBzZWxmLmNsaWNrZWRPdXRzaWRlRWxlbWVudChjb250cm9sRWxlbSwgZXZlbnQpO1xuXG5cdFx0XHQvLyBIaWRlIGRyb3Bkb3duIG1lbnUgaWYgY2xpY2sgb2NjdXJyZWQgb3V0c2lkZSBvZiBtZW51XG5cdFx0XHRpZiAoZXZlbnRPY2N1cmVkT3V0c2lkZU1lbnUgJiYgZXZlbnRPY2N1cmVkT3V0c2lkZUNvbnRyb2wpIHtcblx0XHRcdFx0c2VsZi5zZXRTdGF0ZSh7XG5cdFx0XHRcdFx0aXNPcGVuOiBmYWxzZVxuXHRcdFx0XHR9LCBzZWxmLl91bmJpbmRDbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5fYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmICghZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAmJiBkb2N1bWVudC5hdHRhY2hFdmVudCkge1xuXHRcdFx0XHRkb2N1bWVudC5hdHRhY2hFdmVudCgnb25jbGljaycsIHRoaXMuX2Nsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9jbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5fdW5iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCFkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyICYmIGRvY3VtZW50LmRldGFjaEV2ZW50KSB7XG5cdFx0XHRcdGRvY3VtZW50LmRldGFjaEV2ZW50KCdvbmNsaWNrJywgdGhpcy5fY2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2Nsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR0aGlzLnNldFN0YXRlKHRoaXMuZ2V0U3RhdGVGcm9tVmFsdWUodGhpcy5wcm9wcy52YWx1ZSksIGZ1bmN0aW9uKCl7XG5cdFx0XHQvL0V4ZWN1dGVzIGFmdGVyIHN0YXRlIGNoYW5nZSBpcyBkb25lLiBGaXhlcyBpc3N1ZSAjMjAxXG5cdFx0XHRpZiAodGhpcy5wcm9wcy5hc3luY09wdGlvbnMgJiYgdGhpcy5wcm9wcy5hdXRvbG9hZCkge1xuXHRcdFx0XHR0aGlzLmF1dG9sb2FkQXN5bmNPcHRpb25zKCk7XG5cdFx0XHR9XG4gICAgfSk7XG5cdH0sXG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGNsZWFyVGltZW91dCh0aGlzLl9ibHVyVGltZW91dCk7XG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX2ZvY3VzVGltZW91dCk7XG5cblx0XHRpZih0aGlzLnN0YXRlLmlzT3Blbikge1xuXHRcdFx0dGhpcy5fdW5iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSgpO1xuXHRcdH1cblx0fSxcblxuXHRjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzOiBmdW5jdGlvbihuZXdQcm9wcykge1xuXHRcdGlmIChKU09OLnN0cmluZ2lmeShuZXdQcm9wcy5vcHRpb25zKSAhPT0gSlNPTi5zdHJpbmdpZnkodGhpcy5wcm9wcy5vcHRpb25zKSkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdG9wdGlvbnM6IG5ld1Byb3BzLm9wdGlvbnMsXG5cdFx0XHRcdGZpbHRlcmVkT3B0aW9uczogdGhpcy5maWx0ZXJPcHRpb25zKG5ld1Byb3BzLm9wdGlvbnMpXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0aWYgKG5ld1Byb3BzLnZhbHVlICE9PSB0aGlzLnN0YXRlLnZhbHVlKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHRoaXMuZ2V0U3RhdGVGcm9tVmFsdWUobmV3UHJvcHMudmFsdWUsIG5ld1Byb3BzLm9wdGlvbnMpKTtcblx0XHR9XG5cdH0sXG5cblx0Y29tcG9uZW50RGlkVXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRpZiAoIXRoaXMucHJvcHMuZGlzYWJsZWQgJiYgdGhpcy5fZm9jdXNBZnRlclVwZGF0ZSkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX2JsdXJUaW1lb3V0KTtcblxuXHRcdFx0dGhpcy5fZm9jdXNUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5nZXRJbnB1dE5vZGUoKS5mb2N1cygpO1xuXHRcdFx0XHRzZWxmLl9mb2N1c0FmdGVyVXBkYXRlID0gZmFsc2U7XG5cdFx0XHR9LCA1MCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2ZvY3VzZWRPcHRpb25SZXZlYWwpIHtcblx0XHRcdGlmICh0aGlzLnJlZnMuZm9jdXNlZCAmJiB0aGlzLnJlZnMubWVudSkge1xuXHRcdFx0XHR2YXIgZm9jdXNlZERPTSA9IHRoaXMucmVmcy5mb2N1c2VkLmdldERPTU5vZGUoKTtcblx0XHRcdFx0dmFyIG1lbnVET00gPSB0aGlzLnJlZnMubWVudS5nZXRET01Ob2RlKCk7XG5cdFx0XHRcdHZhciBmb2N1c2VkUmVjdCA9IGZvY3VzZWRET00uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRcdHZhciBtZW51UmVjdCA9IG1lbnVET00uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cblx0XHRcdFx0aWYgKGZvY3VzZWRSZWN0LmJvdHRvbSA+IG1lbnVSZWN0LmJvdHRvbSB8fFxuXHRcdFx0XHRcdGZvY3VzZWRSZWN0LnRvcCA8IG1lbnVSZWN0LnRvcCkge1xuXHRcdFx0XHRcdG1lbnVET00uc2Nyb2xsVG9wID0gKGZvY3VzZWRET00ub2Zmc2V0VG9wICsgZm9jdXNlZERPTS5jbGllbnRIZWlnaHQgLSBtZW51RE9NLm9mZnNldEhlaWdodCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fZm9jdXNlZE9wdGlvblJldmVhbCA9IGZhbHNlO1xuXHRcdH1cblx0fSxcblxuXHRmb2N1czogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5nZXRJbnB1dE5vZGUoKS5mb2N1cygpO1xuXHR9LFxuXG5cdGNsaWNrZWRPdXRzaWRlRWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgZXZlbnQpIHtcblx0XHR2YXIgZXZlbnRUYXJnZXQgPSAoZXZlbnQudGFyZ2V0KSA/IGV2ZW50LnRhcmdldCA6IGV2ZW50LnNyY0VsZW1lbnQ7XG5cdFx0d2hpbGUgKGV2ZW50VGFyZ2V0ICE9IG51bGwpIHtcblx0XHRcdGlmIChldmVudFRhcmdldCA9PT0gZWxlbWVudCkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0ZXZlbnRUYXJnZXQgPSBldmVudFRhcmdldC5vZmZzZXRQYXJlbnQ7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXG5cdGdldFN0YXRlRnJvbVZhbHVlOiBmdW5jdGlvbih2YWx1ZSwgb3B0aW9ucykge1xuXHRcdGlmICghb3B0aW9ucykge1xuXHRcdFx0b3B0aW9ucyA9IHRoaXMuc3RhdGUub3B0aW9ucztcblx0XHR9XG5cblx0XHQvLyByZXNldCBpbnRlcm5hbCBmaWx0ZXIgc3RyaW5nXG5cdFx0aWYgKHRoaXMucHJvcHMuYWxsb3dDcmVhdGUgJiYgdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuXHRcdFx0aWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5maWx0ZXIoZnVuY3Rpb24obykge3JldHVybiBvLnZhbHVlID09PSB2YWx1ZX0pLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0dGhpcy5fb3B0aW9uc0ZpbHRlclN0cmluZyA9ICcnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fb3B0aW9uc0ZpbHRlclN0cmluZyA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9vcHRpb25zRmlsdGVyU3RyaW5nID0gJyc7XG5cdFx0fVxuXG5cdFx0dmFyIHZhbHVlcyA9IHRoaXMuaW5pdFZhbHVlc0FycmF5KHZhbHVlLCBvcHRpb25zKSxcblx0XHRcdGZpbHRlcmVkT3B0aW9ucyA9IHRoaXMuZmlsdGVyT3B0aW9ucyhvcHRpb25zLCB2YWx1ZXMpO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHZhbHVlOiB2YWx1ZXMubWFwKGZ1bmN0aW9uKHYpIHsgcmV0dXJuIHYudmFsdWU7IH0pLmpvaW4odGhpcy5wcm9wcy5kZWxpbWl0ZXIpLFxuXHRcdFx0dmFsdWVzOiB2YWx1ZXMsXG5cdFx0XHRpbnB1dFZhbHVlOiB0aGlzLl9vcHRpb25zRmlsdGVyU3RyaW5nLFxuXHRcdFx0ZmlsdGVyZWRPcHRpb25zOiBmaWx0ZXJlZE9wdGlvbnMsXG5cdFx0XHRwbGFjZWhvbGRlcjogIXRoaXMucHJvcHMubXVsdGkgJiYgdmFsdWVzLmxlbmd0aCA/IHZhbHVlc1swXS5sYWJlbCA6IHRoaXMucHJvcHMucGxhY2Vob2xkZXIsXG5cdFx0XHRmb2N1c2VkT3B0aW9uOiAhdGhpcy5wcm9wcy5tdWx0aSAmJiB2YWx1ZXMubGVuZ3RoID8gdmFsdWVzWzBdIDogZmlsdGVyZWRPcHRpb25zWzBdXG5cdFx0fTtcblx0fSxcblxuXHRpbml0VmFsdWVzQXJyYXk6IGZ1bmN0aW9uKHZhbHVlcywgb3B0aW9ucykge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZXMpKSB7XG5cdFx0XHRpZiAodHlwZW9mIHZhbHVlcyA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0dmFsdWVzID0gdmFsdWVzLnNwbGl0KHRoaXMucHJvcHMuZGVsaW1pdGVyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbHVlcyA9IHZhbHVlcyA/IFt2YWx1ZXNdIDogW107XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHZhbHVlcy5tYXAoZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0Zm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIG9wdGlvbnNba2V5XSAmJiBvcHRpb25zW2tleV0udmFsdWUgPT09IHZhbCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG9wdGlvbnNba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHsgdmFsdWU6IHZhbCwgbGFiZWw6IHZhbCB9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHZhbDtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRzZXRWYWx1ZTogZnVuY3Rpb24odmFsdWUsIGZvY3VzQWZ0ZXJVcGRhdGUpIHtcblx0XHRpZiAoZm9jdXNBZnRlclVwZGF0ZSB8fCBmb2N1c0FmdGVyVXBkYXRlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuX2ZvY3VzQWZ0ZXJVcGRhdGUgPSB0cnVlO1xuXHRcdH1cblx0XHR2YXIgbmV3U3RhdGUgPSB0aGlzLmdldFN0YXRlRnJvbVZhbHVlKHZhbHVlKTtcblx0XHRuZXdTdGF0ZS5pc09wZW4gPSBmYWxzZTtcblx0XHR0aGlzLmZpcmVDaGFuZ2VFdmVudChuZXdTdGF0ZSk7XG5cdFx0dGhpcy5zZXRTdGF0ZShuZXdTdGF0ZSk7XG5cdH0sXG5cblx0c2VsZWN0VmFsdWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLm11bHRpKSB7XG5cdFx0XHR0aGlzLnNldFZhbHVlKHZhbHVlKTtcblx0XHR9IGVsc2UgaWYgKHZhbHVlKSB7XG5cdFx0XHR0aGlzLmFkZFZhbHVlKHZhbHVlKTtcblx0XHR9XG5cdFx0dGhpcy5fdW5iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSgpO1xuXHR9LFxuXG5cdGFkZFZhbHVlOiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdGF0ZS52YWx1ZXMuY29uY2F0KHZhbHVlKSk7XG5cdH0sXG5cblx0cG9wVmFsdWU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc2V0VmFsdWUodGhpcy5zdGF0ZS52YWx1ZXMuc2xpY2UoMCwgdGhpcy5zdGF0ZS52YWx1ZXMubGVuZ3RoIC0gMSkpO1xuXHR9LFxuXG5cdHJlbW92ZVZhbHVlOiBmdW5jdGlvbih2YWx1ZVRvUmVtb3ZlKSB7XG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0YXRlLnZhbHVlcy5maWx0ZXIoZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiB2YWx1ZSAhPT0gdmFsdWVUb1JlbW92ZTtcblx0XHR9KSk7XG5cdH0sXG5cblx0Y2xlYXJWYWx1ZTogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHQvLyBpZiB0aGUgZXZlbnQgd2FzIHRyaWdnZXJlZCBieSBhIG1vdXNlZG93biBhbmQgbm90IHRoZSBwcmltYXJ5XG5cdFx0Ly8gYnV0dG9uLCBpZ25vcmUgaXQuXG5cdFx0aWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICdtb3VzZWRvd24nICYmIGV2ZW50LmJ1dHRvbiAhPT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRoaXMuc2V0VmFsdWUobnVsbCk7XG5cdH0sXG5cblx0cmVzZXRWYWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0YXRlLnZhbHVlID09PSAnJyA/IG51bGwgOiB0aGlzLnN0YXRlLnZhbHVlKTtcblx0fSxcblxuXHRnZXRJbnB1dE5vZGU6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgaW5wdXQgPSB0aGlzLnJlZnMuaW5wdXQ7XG5cdFx0cmV0dXJuIHRoaXMucHJvcHMuc2VhcmNoYWJsZSA/IGlucHV0IDogaW5wdXQuZ2V0RE9NTm9kZSgpO1xuXHR9LFxuXG5cdGZpcmVDaGFuZ2VFdmVudDogZnVuY3Rpb24obmV3U3RhdGUpIHtcblx0XHRpZiAobmV3U3RhdGUudmFsdWUgIT09IHRoaXMuc3RhdGUudmFsdWUgJiYgdGhpcy5wcm9wcy5vbkNoYW5nZSkge1xuXHRcdFx0dGhpcy5wcm9wcy5vbkNoYW5nZShuZXdTdGF0ZS52YWx1ZSwgbmV3U3RhdGUudmFsdWVzKTtcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlTW91c2VEb3duOiBmdW5jdGlvbihldmVudCkge1xuXHRcdC8vIGlmIHRoZSBldmVudCB3YXMgdHJpZ2dlcmVkIGJ5IGEgbW91c2Vkb3duIGFuZCBub3QgdGhlIHByaW1hcnlcblx0XHQvLyBidXR0b24sIG9yIGlmIHRoZSBjb21wb25lbnQgaXMgZGlzYWJsZWQsIGlnbm9yZSBpdC5cblx0XHRpZiAodGhpcy5wcm9wcy5kaXNhYmxlZCB8fCAoZXZlbnQudHlwZSA9PT0gJ21vdXNlZG93bicgJiYgZXZlbnQuYnV0dG9uICE9PSAwKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0aWYgKHRoaXMuc3RhdGUuaXNGb2N1c2VkKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0aXNPcGVuOiB0cnVlXG5cdFx0XHR9LCB0aGlzLl9iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuX29wZW5BZnRlckZvY3VzID0gdHJ1ZTtcblx0XHRcdHRoaXMuZ2V0SW5wdXROb2RlKCkuZm9jdXMoKTtcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlTW91c2VEb3duT25BcnJvdzogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHQvLyBpZiB0aGUgZXZlbnQgd2FzIHRyaWdnZXJlZCBieSBhIG1vdXNlZG93biBhbmQgbm90IHRoZSBwcmltYXJ5XG5cdFx0Ly8gYnV0dG9uLCBvciBpZiB0aGUgY29tcG9uZW50IGlzIGRpc2FibGVkLCBpZ25vcmUgaXQuXG5cdFx0aWYgKHRoaXMucHJvcHMuZGlzYWJsZWQgfHwgKGV2ZW50LnR5cGUgPT09ICdtb3VzZWRvd24nICYmIGV2ZW50LmJ1dHRvbiAhPT0gMCkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly8gSWYgbm90IGZvY3VzZWQsIGhhbmRsZU1vdXNlRG93biB3aWxsIGhhbmRsZSBpdFxuXHRcdGlmICghdGhpcy5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNPcGVuOiBmYWxzZVxuXHRcdH0sIHRoaXMuX3VuYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUpO1xuXHR9LFxuXG5cdGhhbmRsZUlucHV0Rm9jdXM6IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0dmFyIG5ld0lzT3BlbiA9IHRoaXMuc3RhdGUuaXNPcGVuIHx8IHRoaXMuX29wZW5BZnRlckZvY3VzO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aW5wdXRWYWx1ZTogdGhpcy5zdGF0ZS52YWx1ZSxcblx0XHRcdGlzRm9jdXNlZDogdHJ1ZSxcblx0XHRcdGlzT3BlbjogbmV3SXNPcGVuXG5cdFx0fSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRpZihuZXdJc09wZW4pIHtcblx0XHRcdFx0dGhpcy5fYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUoKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHR0aGlzLl91bmJpbmRDbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5fb3BlbkFmdGVyRm9jdXMgPSBmYWxzZTtcblxuXHRcdGlmICh0aGlzLnByb3BzLm9uRm9jdXMpIHtcblx0XHRcdHRoaXMucHJvcHMub25Gb2N1cyhldmVudCk7XG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUlucHV0Qmx1cjogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHR0aGlzLl9ibHVyVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoc2VsZi5fZm9jdXNBZnRlclVwZGF0ZSkgcmV0dXJuO1xuXG5cdFx0XHRzZWxmLnNldFN0YXRlKHtcblx0XHRcdFx0aXNGb2N1c2VkOiBmYWxzZVxuXHRcdFx0fSk7XG5cdFx0fSwgNTApO1xuXG5cdFx0aWYgKHRoaXMucHJvcHMub25CbHVyKSB7XG5cdFx0XHR0aGlzLnByb3BzLm9uQmx1cihldmVudCk7XG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUtleURvd246IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZGlzYWJsZWQpIHJldHVybjtcblxuXHRcdHN3aXRjaCAoZXZlbnQua2V5Q29kZSkge1xuXG5cdFx0XHRjYXNlIDg6IC8vIGJhY2tzcGFjZVxuXHRcdFx0XHRpZiAoIXRoaXMuc3RhdGUuaW5wdXRWYWx1ZSkge1xuXHRcdFx0XHRcdHRoaXMucG9wVmFsdWUoKTtcblx0XHRcdFx0fVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRjYXNlIDk6IC8vIHRhYlxuXHRcdFx0XHRpZiAoZXZlbnQuc2hpZnRLZXkgfHwgIXRoaXMuc3RhdGUuaXNPcGVuIHx8ICF0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24pIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5zZWxlY3RGb2N1c2VkT3B0aW9uKCk7XG5cdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAxMzogLy8gZW50ZXJcblx0XHRcdFx0aWYgKCF0aGlzLnN0YXRlLmlzT3BlbikgcmV0dXJuO1xuXG5cdFx0XHRcdHRoaXMuc2VsZWN0Rm9jdXNlZE9wdGlvbigpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgMjc6IC8vIGVzY2FwZVxuXHRcdFx0XHRpZiAodGhpcy5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdFx0XHR0aGlzLnJlc2V0VmFsdWUoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLmNsZWFyVmFsdWUoKTtcblx0XHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgMzg6IC8vIHVwXG5cdFx0XHRcdHRoaXMuZm9jdXNQcmV2aW91c09wdGlvbigpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgNDA6IC8vIGRvd25cblx0XHRcdFx0dGhpcy5mb2N1c05leHRPcHRpb24oKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDE4ODogLy8gLFxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6IHJldHVybjtcblx0XHR9XG5cblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9LFxuXG5cdC8vIEVuc3VyZXMgdGhhdCB0aGUgY3VycmVudGx5IGZvY3VzZWQgb3B0aW9uIGlzIGF2YWlsYWJsZSBpbiBmaWx0ZXJlZE9wdGlvbnMuXG5cdC8vIElmIG5vdCwgcmV0dXJucyB0aGUgZmlyc3QgYXZhaWxhYmxlIG9wdGlvbi5cblx0X2dldE5ld0ZvY3VzZWRPcHRpb246IGZ1bmN0aW9uKGZpbHRlcmVkT3B0aW9ucykge1xuXHRcdGZvciAodmFyIGtleSBpbiBmaWx0ZXJlZE9wdGlvbnMpIHtcblx0XHRcdGlmIChmaWx0ZXJlZE9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBmaWx0ZXJlZE9wdGlvbnNba2V5XSA9PT0gdGhpcy5zdGF0ZS5mb2N1c2VkT3B0aW9uKSB7XG5cdFx0XHRcdHJldHVybiBmaWx0ZXJlZE9wdGlvbnNba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZpbHRlcmVkT3B0aW9uc1swXTtcblx0fSxcblxuXHRoYW5kbGVJbnB1dENoYW5nZTogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHQvLyBhc3NpZ24gYW4gaW50ZXJuYWwgdmFyaWFibGUgYmVjYXVzZSB3ZSBuZWVkIHRvIHVzZVxuXHRcdC8vIHRoZSBsYXRlc3QgdmFsdWUgYmVmb3JlIHNldFN0YXRlKCkgaGFzIGNvbXBsZXRlZC5cblx0XHR0aGlzLl9vcHRpb25zRmlsdGVyU3RyaW5nID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXG5cdFx0aWYgKHRoaXMucHJvcHMuYXN5bmNPcHRpb25zKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0aXNMb2FkaW5nOiB0cnVlLFxuXHRcdFx0XHRpbnB1dFZhbHVlOiBldmVudC50YXJnZXQudmFsdWVcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5sb2FkQXN5bmNPcHRpb25zKGV2ZW50LnRhcmdldC52YWx1ZSwge1xuXHRcdFx0XHRpc0xvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRpc09wZW46IHRydWVcblx0XHRcdH0sIHRoaXMuX2JpbmRDbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGZpbHRlcmVkT3B0aW9ucyA9IHRoaXMuZmlsdGVyT3B0aW9ucyh0aGlzLnN0YXRlLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGlzT3BlbjogdHJ1ZSxcblx0XHRcdFx0aW5wdXRWYWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlLFxuXHRcdFx0XHRmaWx0ZXJlZE9wdGlvbnM6IGZpbHRlcmVkT3B0aW9ucyxcblx0XHRcdFx0Zm9jdXNlZE9wdGlvbjogdGhpcy5fZ2V0TmV3Rm9jdXNlZE9wdGlvbihmaWx0ZXJlZE9wdGlvbnMpXG5cdFx0XHR9LCB0aGlzLl9iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0fVxuXHR9LFxuXG5cdGF1dG9sb2FkQXN5bmNPcHRpb25zOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5sb2FkQXN5bmNPcHRpb25zKCcnLCB7fSwgZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gdXBkYXRlIHdpdGggZmV0Y2hlZCBidXQgZG9uJ3QgZm9jdXNcblx0XHRcdHNlbGYuc2V0VmFsdWUoc2VsZi5wcm9wcy52YWx1ZSwgZmFsc2UpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdGxvYWRBc3luY09wdGlvbnM6IGZ1bmN0aW9uKGlucHV0LCBzdGF0ZSwgY2FsbGJhY2spIHtcblx0XHR2YXIgdGhpc1JlcXVlc3RJZCA9IHRoaXMuX2N1cnJlbnRSZXF1ZXN0SWQgPSByZXF1ZXN0SWQrKztcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2FjaGVLZXkgPSBpbnB1dC5zbGljZSgwLCBpKTtcblx0XHRcdGlmICh0aGlzLl9vcHRpb25zQ2FjaGVbY2FjaGVLZXldICYmIChpbnB1dCA9PT0gY2FjaGVLZXkgfHwgdGhpcy5fb3B0aW9uc0NhY2hlW2NhY2hlS2V5XS5jb21wbGV0ZSkpIHtcblx0XHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLl9vcHRpb25zQ2FjaGVbY2FjaGVLZXldLm9wdGlvbnM7XG5cdFx0XHRcdHZhciBmaWx0ZXJlZE9wdGlvbnMgPSB0aGlzLmZpbHRlck9wdGlvbnMob3B0aW9ucyk7XG5cblx0XHRcdFx0dmFyIG5ld1N0YXRlID0ge1xuXHRcdFx0XHRcdG9wdGlvbnM6IG9wdGlvbnMsXG5cdFx0XHRcdFx0ZmlsdGVyZWRPcHRpb25zOiBmaWx0ZXJlZE9wdGlvbnMsXG5cdFx0XHRcdFx0Zm9jdXNlZE9wdGlvbjogdGhpcy5fZ2V0TmV3Rm9jdXNlZE9wdGlvbihmaWx0ZXJlZE9wdGlvbnMpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiBzdGF0ZSkge1xuXHRcdFx0XHRcdGlmIChzdGF0ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0XHRuZXdTdGF0ZVtrZXldID0gc3RhdGVba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5zZXRTdGF0ZShuZXdTdGF0ZSk7XG5cdFx0XHRcdGlmKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKHRoaXMsIHt9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLnByb3BzLmFzeW5jT3B0aW9ucyhpbnB1dCwgZnVuY3Rpb24oZXJyLCBkYXRhKSB7XG5cblx0XHRcdGlmIChlcnIpIHRocm93IGVycjtcblxuXHRcdFx0c2VsZi5fb3B0aW9uc0NhY2hlW2lucHV0XSA9IGRhdGE7XG5cblx0XHRcdGlmICh0aGlzUmVxdWVzdElkICE9PSBzZWxmLl9jdXJyZW50UmVxdWVzdElkKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBmaWx0ZXJlZE9wdGlvbnMgPSBzZWxmLmZpbHRlck9wdGlvbnMoZGF0YS5vcHRpb25zKTtcblxuXHRcdFx0dmFyIG5ld1N0YXRlID0ge1xuXHRcdFx0XHRvcHRpb25zOiBkYXRhLm9wdGlvbnMsXG5cdFx0XHRcdGZpbHRlcmVkT3B0aW9uczogZmlsdGVyZWRPcHRpb25zLFxuXHRcdFx0XHRmb2N1c2VkT3B0aW9uOiBzZWxmLl9nZXROZXdGb2N1c2VkT3B0aW9uKGZpbHRlcmVkT3B0aW9ucylcblx0XHRcdH07XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gc3RhdGUpIHtcblx0XHRcdFx0aWYgKHN0YXRlLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRuZXdTdGF0ZVtrZXldID0gc3RhdGVba2V5XTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0c2VsZi5zZXRTdGF0ZShuZXdTdGF0ZSk7XG5cblx0XHRcdGlmKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKHNlbGYsIHt9KTtcblxuXHRcdH0pO1xuXHR9LFxuXG5cdGZpbHRlck9wdGlvbnM6IGZ1bmN0aW9uKG9wdGlvbnMsIHZhbHVlcykge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zZWFyY2hhYmxlKSB7XG5cdFx0XHRyZXR1cm4gb3B0aW9ucztcblx0XHR9XG5cblx0XHR2YXIgZmlsdGVyVmFsdWUgPSB0aGlzLl9vcHRpb25zRmlsdGVyU3RyaW5nO1xuXHRcdHZhciBleGNsdWRlID0gKHZhbHVlcyB8fCB0aGlzLnN0YXRlLnZhbHVlcykubWFwKGZ1bmN0aW9uKGkpIHtcblx0XHRcdHJldHVybiBpLnZhbHVlO1xuXHRcdH0pO1xuXHRcdGlmICh0aGlzLnByb3BzLmZpbHRlck9wdGlvbnMpIHtcblx0XHRcdHJldHVybiB0aGlzLnByb3BzLmZpbHRlck9wdGlvbnMuY2FsbCh0aGlzLCBvcHRpb25zLCBmaWx0ZXJWYWx1ZSwgZXhjbHVkZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBmaWx0ZXJPcHRpb24gPSBmdW5jdGlvbihvcCkge1xuXHRcdFx0XHRpZiAodGhpcy5wcm9wcy5tdWx0aSAmJiBleGNsdWRlLmluZGV4T2Yob3AudmFsdWUpID4gLTEpIHJldHVybiBmYWxzZTtcblx0XHRcdFx0aWYgKHRoaXMucHJvcHMuZmlsdGVyT3B0aW9uKSByZXR1cm4gdGhpcy5wcm9wcy5maWx0ZXJPcHRpb24uY2FsbCh0aGlzLCBvcCwgZmlsdGVyVmFsdWUpO1xuXHRcdFx0XHR2YXIgdmFsdWVUZXN0ID0gU3RyaW5nKG9wLnZhbHVlKSwgbGFiZWxUZXN0ID0gU3RyaW5nKG9wLmxhYmVsKTtcblx0XHRcdFx0aWYgKHRoaXMucHJvcHMuaWdub3JlQ2FzZSkge1xuXHRcdFx0XHRcdHZhbHVlVGVzdCA9IHZhbHVlVGVzdC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdGxhYmVsVGVzdCA9IGxhYmVsVGVzdC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdGZpbHRlclZhbHVlID0gZmlsdGVyVmFsdWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gIWZpbHRlclZhbHVlIHx8ICh0aGlzLnByb3BzLm1hdGNoUG9zID09PSAnc3RhcnQnKSA/IChcblx0XHRcdFx0XHQodGhpcy5wcm9wcy5tYXRjaFByb3AgIT09ICdsYWJlbCcgJiYgdmFsdWVUZXN0LnN1YnN0cigwLCBmaWx0ZXJWYWx1ZS5sZW5ndGgpID09PSBmaWx0ZXJWYWx1ZSkgfHxcblx0XHRcdFx0XHQodGhpcy5wcm9wcy5tYXRjaFByb3AgIT09ICd2YWx1ZScgJiYgbGFiZWxUZXN0LnN1YnN0cigwLCBmaWx0ZXJWYWx1ZS5sZW5ndGgpID09PSBmaWx0ZXJWYWx1ZSlcblx0XHRcdFx0KSA6IChcblx0XHRcdFx0XHQodGhpcy5wcm9wcy5tYXRjaFByb3AgIT09ICdsYWJlbCcgJiYgdmFsdWVUZXN0LmluZGV4T2YoZmlsdGVyVmFsdWUpID49IDApIHx8XG5cdFx0XHRcdFx0KHRoaXMucHJvcHMubWF0Y2hQcm9wICE9PSAndmFsdWUnICYmIGxhYmVsVGVzdC5pbmRleE9mKGZpbHRlclZhbHVlKSA+PSAwKVxuXHRcdFx0XHQpO1xuXHRcdFx0fTtcblx0XHRcdHJldHVybiAob3B0aW9ucyB8fCBbXSkuZmlsdGVyKGZpbHRlck9wdGlvbiwgdGhpcyk7XG5cdFx0fVxuXHR9LFxuXG5cdHNlbGVjdEZvY3VzZWRPcHRpb246IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzLnByb3BzLmFsbG93Q3JlYXRlICYmICF0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24pIHtcblx0XHRcdHJldHVybiB0aGlzLnNlbGVjdFZhbHVlKHRoaXMuc3RhdGUuaW5wdXRWYWx1ZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLnNlbGVjdFZhbHVlKHRoaXMuc3RhdGUuZm9jdXNlZE9wdGlvbik7XG5cdH0sXG5cblx0Zm9jdXNPcHRpb246IGZ1bmN0aW9uKG9wKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRmb2N1c2VkT3B0aW9uOiBvcFxuXHRcdH0pO1xuXHR9LFxuXG5cdGZvY3VzTmV4dE9wdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5mb2N1c0FkamFjZW50T3B0aW9uKCduZXh0Jyk7XG5cdH0sXG5cblx0Zm9jdXNQcmV2aW91c09wdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5mb2N1c0FkamFjZW50T3B0aW9uKCdwcmV2aW91cycpO1xuXHR9LFxuXG5cdGZvY3VzQWRqYWNlbnRPcHRpb246IGZ1bmN0aW9uKGRpcikge1xuXHRcdHRoaXMuX2ZvY3VzZWRPcHRpb25SZXZlYWwgPSB0cnVlO1xuXG5cdFx0dmFyIG9wcyA9IHRoaXMuc3RhdGUuZmlsdGVyZWRPcHRpb25zO1xuXG5cdFx0aWYgKCF0aGlzLnN0YXRlLmlzT3Blbikge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGlzT3BlbjogdHJ1ZSxcblx0XHRcdFx0aW5wdXRWYWx1ZTogJycsXG5cdFx0XHRcdGZvY3VzZWRPcHRpb246IHRoaXMuc3RhdGUuZm9jdXNlZE9wdGlvbiB8fCBvcHNbZGlyID09PSAnbmV4dCcgPyAwIDogb3BzLmxlbmd0aCAtIDFdXG5cdFx0XHR9LCB0aGlzLl9iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCFvcHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGZvY3VzZWRJbmRleCA9IC0xO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBvcHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGlmICh0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24gPT09IG9wc1tpXSkge1xuXHRcdFx0XHRmb2N1c2VkSW5kZXggPSBpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgZm9jdXNlZE9wdGlvbiA9IG9wc1swXTtcblxuXHRcdGlmIChkaXIgPT09ICduZXh0JyAmJiBmb2N1c2VkSW5kZXggPiAtMSAmJiBmb2N1c2VkSW5kZXggPCBvcHMubGVuZ3RoIC0gMSkge1xuXHRcdFx0Zm9jdXNlZE9wdGlvbiA9IG9wc1tmb2N1c2VkSW5kZXggKyAxXTtcblx0XHR9IGVsc2UgaWYgKGRpciA9PT0gJ3ByZXZpb3VzJykge1xuXHRcdFx0aWYgKGZvY3VzZWRJbmRleCA+IDApIHtcblx0XHRcdFx0Zm9jdXNlZE9wdGlvbiA9IG9wc1tmb2N1c2VkSW5kZXggLSAxXTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvY3VzZWRPcHRpb24gPSBvcHNbb3BzLmxlbmd0aCAtIDFdO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0Zm9jdXNlZE9wdGlvbjogZm9jdXNlZE9wdGlvblxuXHRcdH0pO1xuXG5cdH0sXG5cblx0dW5mb2N1c09wdGlvbjogZnVuY3Rpb24ob3ApIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5mb2N1c2VkT3B0aW9uID09PSBvcCkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGZvY3VzZWRPcHRpb246IG51bGxcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblxuXHRidWlsZE1lbnU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBmb2N1c2VkVmFsdWUgPSB0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24gPyB0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24udmFsdWUgOiBudWxsO1xuXG5cdFx0aWYodGhpcy5zdGF0ZS5maWx0ZXJlZE9wdGlvbnMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9jdXNlZFZhbHVlID0gZm9jdXNlZFZhbHVlID09IG51bGwgPyB0aGlzLnN0YXRlLmZpbHRlcmVkT3B0aW9uc1swXSA6IGZvY3VzZWRWYWx1ZTtcblx0XHR9XG5cblx0XHR2YXIgb3BzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZS5maWx0ZXJlZE9wdGlvbnMpLm1hcChmdW5jdGlvbihrZXkpIHtcblx0XHRcdHZhciBvcCA9IHRoaXMuc3RhdGUuZmlsdGVyZWRPcHRpb25zW2tleV07XG5cdFx0XHR2YXIgaXNGb2N1c2VkID0gZm9jdXNlZFZhbHVlID09PSBvcC52YWx1ZTtcblxuXHRcdFx0dmFyIG9wdGlvbkNsYXNzID0gY2xhc3Nlcyh7XG5cdFx0XHRcdCdTZWxlY3Qtb3B0aW9uJzogdHJ1ZSxcblx0XHRcdFx0J2lzLWZvY3VzZWQnOiBpc0ZvY3VzZWQsXG5cdFx0XHRcdCdpcy1kaXNhYmxlZCc6IG9wLmRpc2FibGVkXG5cdFx0XHR9KTtcblxuXHRcdFx0dmFyIHJlZiA9IGlzRm9jdXNlZCA/ICdmb2N1c2VkJyA6IG51bGw7XG5cblx0XHRcdHZhciBtb3VzZUVudGVyID0gdGhpcy5mb2N1c09wdGlvbi5iaW5kKHRoaXMsIG9wKTtcblx0XHRcdHZhciBtb3VzZUxlYXZlID0gdGhpcy51bmZvY3VzT3B0aW9uLmJpbmQodGhpcywgb3ApO1xuXHRcdFx0dmFyIG1vdXNlRG93biA9IHRoaXMuc2VsZWN0VmFsdWUuYmluZCh0aGlzLCBvcCk7XG5cblx0XHRcdGlmIChvcC5kaXNhYmxlZCkge1xuXHRcdFx0XHRyZXR1cm4gPGRpdiByZWY9e3JlZn0ga2V5PXsnb3B0aW9uLScgKyBvcC52YWx1ZX0gY2xhc3NOYW1lPXtvcHRpb25DbGFzc30+e29wLmxhYmVsfTwvZGl2Pjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiA8ZGl2IHJlZj17cmVmfSBrZXk9eydvcHRpb24tJyArIG9wLnZhbHVlfVxuXHRcdFx0XHRcdGNsYXNzTmFtZT17b3B0aW9uQ2xhc3N9XG5cdFx0XHRcdFx0b25Nb3VzZUVudGVyPXttb3VzZUVudGVyfVxuXHRcdFx0XHRcdG9uTW91c2VMZWF2ZT17bW91c2VMZWF2ZX1cblx0XHRcdFx0XHRvbk1vdXNlRG93bj17bW91c2VEb3dufVxuXHRcdFx0XHRcdG9uQ2xpY2s9e21vdXNlRG93bn0+XG5cdFx0XHRcdFx0XHR7b3AubGFiZWx9XG5cdFx0XHRcdFx0PC9kaXY+O1xuXHRcdFx0fVxuXHRcdH0sIHRoaXMpO1xuXG5cdFx0cmV0dXJuIG9wcy5sZW5ndGggPyBvcHMgOiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIlNlbGVjdC1ub3Jlc3VsdHNcIj5cblx0XHRcdFx0e3RoaXMucHJvcHMuYXN5bmNPcHRpb25zICYmICF0aGlzLnN0YXRlLmlucHV0VmFsdWUgPyB0aGlzLnByb3BzLnNlYXJjaFByb21wdFRleHQgOiB0aGlzLnByb3BzLm5vUmVzdWx0c1RleHR9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9LFxuXG5cdGhhbmRsZU9wdGlvbkxhYmVsQ2xpY2s6IGZ1bmN0aW9uICh2YWx1ZSwgZXZlbnQpIHtcblx0XHR2YXIgaGFuZGxlciA9IHRoaXMucHJvcHMub25PcHRpb25MYWJlbENsaWNrO1xuXG5cdFx0aWYgKGhhbmRsZXIpIHtcblx0XHRcdGhhbmRsZXIodmFsdWUsIGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cblx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZWN0Q2xhc3MgPSBjbGFzc2VzKCdTZWxlY3QnLCB0aGlzLnByb3BzLmNsYXNzTmFtZSwge1xuXHRcdFx0J2lzLW11bHRpJzogdGhpcy5wcm9wcy5tdWx0aSxcblx0XHRcdCdpcy1zZWFyY2hhYmxlJzogdGhpcy5wcm9wcy5zZWFyY2hhYmxlLFxuXHRcdFx0J2lzLW9wZW4nOiB0aGlzLnN0YXRlLmlzT3Blbixcblx0XHRcdCdpcy1mb2N1c2VkJzogdGhpcy5zdGF0ZS5pc0ZvY3VzZWQsXG5cdFx0XHQnaXMtbG9hZGluZyc6IHRoaXMuc3RhdGUuaXNMb2FkaW5nLFxuXHRcdFx0J2lzLWRpc2FibGVkJzogdGhpcy5wcm9wcy5kaXNhYmxlZCxcblx0XHRcdCdoYXMtdmFsdWUnOiB0aGlzLnN0YXRlLnZhbHVlXG5cdFx0fSk7XG5cblx0XHR2YXIgdmFsdWUgPSBbXTtcblxuXHRcdGlmICh0aGlzLnByb3BzLm11bHRpKSB7XG5cdFx0XHR0aGlzLnN0YXRlLnZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbCkge1xuXHRcdFx0XHR2YXIgcHJvcHMgPSB7XG5cdFx0XHRcdFx0a2V5OiB2YWwudmFsdWUsXG5cdFx0XHRcdFx0b3B0aW9uTGFiZWxDbGljazogISF0aGlzLnByb3BzLm9uT3B0aW9uTGFiZWxDbGljayxcblx0XHRcdFx0XHRvbk9wdGlvbkxhYmVsQ2xpY2s6IHRoaXMuaGFuZGxlT3B0aW9uTGFiZWxDbGljay5iaW5kKHRoaXMsIHZhbCksXG5cdFx0XHRcdFx0b25SZW1vdmU6IHRoaXMucmVtb3ZlVmFsdWUuYmluZCh0aGlzLCB2YWwpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiB2YWwpIHtcblx0XHRcdFx0XHRpZiAodmFsLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRcdHByb3BzW2tleV0gPSB2YWxba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFsdWUucHVzaCg8VmFsdWUgey4uLnByb3BzfSAvPik7XG5cdFx0XHR9LCB0aGlzKTtcblx0XHR9XG5cblx0XHRpZiAoIXRoaXMucHJvcHMuaXNGb2N1c2VkICYmICh0aGlzLnByb3BzLmRpc2FibGVkIHx8ICghdGhpcy5zdGF0ZS5pbnB1dFZhbHVlICYmICghdGhpcy5wcm9wcy5tdWx0aSB8fCAhdmFsdWUubGVuZ3RoKSkpKSB7XG5cdFx0XHR2YWx1ZS5wdXNoKDxkaXYgY2xhc3NOYW1lPVwiU2VsZWN0LXBsYWNlaG9sZGVyXCIga2V5PVwicGxhY2Vob2xkZXJcIj57dGhpcy5zdGF0ZS5wbGFjZWhvbGRlcn08L2Rpdj4pO1xuXHRcdH1cblxuXHRcdHZhciBsb2FkaW5nID0gdGhpcy5zdGF0ZS5pc0xvYWRpbmcgPyA8c3BhbiBjbGFzc05hbWU9XCJTZWxlY3QtbG9hZGluZ1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogbnVsbDtcblx0XHR2YXIgY2xlYXIgPSB0aGlzLnByb3BzLmNsZWFyYWJsZSAmJiB0aGlzLnN0YXRlLnZhbHVlICYmICF0aGlzLnByb3BzLmRpc2FibGVkID8gPHNwYW4gY2xhc3NOYW1lPVwiU2VsZWN0LWNsZWFyXCIgdGl0bGU9e3RoaXMucHJvcHMubXVsdGkgPyB0aGlzLnByb3BzLmNsZWFyQWxsVGV4dCA6IHRoaXMucHJvcHMuY2xlYXJWYWx1ZVRleHR9IGFyaWEtbGFiZWw9e3RoaXMucHJvcHMubXVsdGkgPyB0aGlzLnByb3BzLmNsZWFyQWxsVGV4dCA6IHRoaXMucHJvcHMuY2xlYXJWYWx1ZVRleHR9IG9uTW91c2VEb3duPXt0aGlzLmNsZWFyVmFsdWV9IG9uQ2xpY2s9e3RoaXMuY2xlYXJWYWx1ZX0gZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw9e3sgX19odG1sOiAnJnRpbWVzOycgfX0gLz4gOiBudWxsO1xuXG5cdFx0dmFyIG1lbnU7XG5cdFx0dmFyIG1lbnVQcm9wcztcblx0XHRpZiAodGhpcy5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdG1lbnVQcm9wcyA9IHtcblx0XHRcdFx0cmVmOiAnbWVudScsXG5cdFx0XHRcdGNsYXNzTmFtZTogJ1NlbGVjdC1tZW51J1xuXHRcdFx0fTtcblx0XHRcdGlmICh0aGlzLnByb3BzLm11bHRpKSB7XG5cdFx0XHRcdG1lbnVQcm9wcy5vbk1vdXNlRG93biA9IHRoaXMuaGFuZGxlTW91c2VEb3duO1xuXHRcdFx0fVxuXHRcdFx0bWVudSA9IChcblx0XHRcdFx0PGRpdiByZWY9XCJzZWxlY3RNZW51Q29udGFpbmVyXCIgY2xhc3NOYW1lPVwiU2VsZWN0LW1lbnUtb3V0ZXJcIj5cblx0XHRcdFx0XHQ8ZGl2IHsuLi5tZW51UHJvcHN9Pnt0aGlzLmJ1aWxkTWVudSgpfTwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0dmFyIGlucHV0O1xuXHRcdHZhciBpbnB1dFByb3BzID0ge1xuXHRcdFx0cmVmOiAnaW5wdXQnLFxuXHRcdFx0Y2xhc3NOYW1lOiAnU2VsZWN0LWlucHV0Jyxcblx0XHRcdHRhYkluZGV4OiB0aGlzLnByb3BzLnRhYkluZGV4IHx8IDAsXG5cdFx0XHRvbkZvY3VzOiB0aGlzLmhhbmRsZUlucHV0Rm9jdXMsXG5cdFx0XHRvbkJsdXI6IHRoaXMuaGFuZGxlSW5wdXRCbHVyXG5cdFx0fTtcblx0XHRmb3IgKHZhciBrZXkgaW4gdGhpcy5wcm9wcy5pbnB1dFByb3BzKSB7XG5cdFx0XHRpZiAodGhpcy5wcm9wcy5pbnB1dFByb3BzLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0aW5wdXRQcm9wc1trZXldID0gdGhpcy5wcm9wcy5pbnB1dFByb3BzW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMucHJvcHMuc2VhcmNoYWJsZSAmJiAhdGhpcy5wcm9wcy5kaXNhYmxlZCkge1xuXHRcdFx0aW5wdXQgPSA8SW5wdXQgdmFsdWU9e3RoaXMuc3RhdGUuaW5wdXRWYWx1ZX0gb25DaGFuZ2U9e3RoaXMuaGFuZGxlSW5wdXRDaGFuZ2V9IG1pbldpZHRoPVwiNVwiIHsuLi5pbnB1dFByb3BzfSAvPjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aW5wdXQgPSA8ZGl2IHsuLi5pbnB1dFByb3BzfT4mbmJzcDs8L2Rpdj47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgcmVmPVwid3JhcHBlclwiIGNsYXNzTmFtZT17c2VsZWN0Q2xhc3N9PlxuXHRcdFx0XHQ8aW5wdXQgdHlwZT1cImhpZGRlblwiIHJlZj1cInZhbHVlXCIgbmFtZT17dGhpcy5wcm9wcy5uYW1lfSB2YWx1ZT17dGhpcy5zdGF0ZS52YWx1ZX0gZGlzYWJsZWQ9e3RoaXMucHJvcHMuZGlzYWJsZWR9IC8+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiU2VsZWN0LWNvbnRyb2xcIiByZWY9XCJjb250cm9sXCIgb25LZXlEb3duPXt0aGlzLmhhbmRsZUtleURvd259IG9uTW91c2VEb3duPXt0aGlzLmhhbmRsZU1vdXNlRG93bn0gb25Ub3VjaEVuZD17dGhpcy5oYW5kbGVNb3VzZURvd259PlxuXHRcdFx0XHRcdHt2YWx1ZX1cblx0XHRcdFx0XHR7aW5wdXR9XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPVwiU2VsZWN0LWFycm93LXpvbmVcIiBvbk1vdXNlRG93bj17dGhpcy5oYW5kbGVNb3VzZURvd25PbkFycm93fSAvPlxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cIlNlbGVjdC1hcnJvd1wiIG9uTW91c2VEb3duPXt0aGlzLmhhbmRsZU1vdXNlRG93bk9uQXJyb3d9IC8+XG5cdFx0XHRcdFx0e2xvYWRpbmd9XG5cdFx0XHRcdFx0e2NsZWFyfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0e21lbnV9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdDtcbiJdfQ==
