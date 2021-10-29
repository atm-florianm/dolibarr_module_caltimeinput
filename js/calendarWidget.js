// jshint esversion: 6
/* Copyright (C) 2021 ATM Consulting <florian.mortgat@atm-consulting.fr>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */

(() => {
	"use strict";

	// 24 hours of 60 minutes of 60 seconds of 1000 milliseconds each
	// beware:
	//  transition days between daylight saving time and standard time CAN last
	//  more or less than 24 hours.
	const DAY_MILLISEC = 24 * 60 * 60 * 1000;

	// translation keys for weekday names
	const STD_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// translation keys for month names
	const STD_MONTH = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	// number or numeric string → integer
	const int = (n) => ~~n;

	/**
	 * 
	 * @param {String} tagName
	 * @param {Object} attributes
	 * @param {HTMLElement} parent
	 * @return {HTMLElement}
	 */
	const newElement = (tagName, attributes = {}, parent = undefined) => {
		const element = document.createElement(tagName);
		const supportedAttrs = [
			'className',
			'id',
			'type',
			'placeholder',
			'colspan',
		];
		for (let i = 0; i < supportedAttrs.length; i++) {
			let k = supportedAttrs[i];
			if (attributes[k]) {
				element[k] = attributes[k];
			}
		}
		if (attributes.data) {
			for (let dataAttr in attributes.data) {
				if (attributes.data.hasOwnProperty(dataAttr)) {
					element.setAttribute('data-' + dataAttr, attributes.data[dataAttr]);
				}
			}
		}
		if (parent) {
			parent.appendChild(element);
		}
		return element;
	};

	/**
	 * Wrapper pour l'objet Date avec 3 méthodes helpers
	 */
	class CalendarWidgetDate extends Date {
		constructor(...args) {
			super(...args);
		}

		// this implementation is very inefficient / unclean looking, but it is safe from
		// daylight saving time problems (using standard arithmetic would be more
		// difficult because when you transition from daylight saving time to standard
		// time, you can have a day that is more than 24 hours (or less)).
		/**
		 * @param {Number} n
		 */
		goForwardXDays(n = 1) {
			// why add an extra halfday? because some days are longer than 24 hours (because of daylight saving time)
			this.setHours(0, 0, 0, 0);
			this.setTime(this.getTime() + DAY_MILLISEC * n + (DAY_MILLISEC >> 1));
			this.setHours(0, 0, 0, 0);
		}

		/**
		 * @param {Number} n
		 */
		goBackXDays(n = 1) {
			for (let i = 0; i < n; i++) {
				this.setHours(0, 0, 0, 0);
				this.setTime(this.getTime() - 1);
				this.setHours(0, 0, 0, 0);
			}
		}
		
		/**
		 * @param {Date} date
		 * @return {string}  Date formatted as Y-m-d (used as a dictionary key)
		 */
		getYMDString() {
			let y = '' + date.getFullYear();
			let m = '' + (1 + date.getMonth());
			let d = '' + date.getDate();
			while (y.length < 4) {
				y = '0' + y;
			}
			if (m.length < 2) m = '0' + m;
			if (d.length < 2) d = '0' + d;
			return `{$y}-{$m}-{$d}`;
		}
	}

	/**
	 * @param {Object} config
	 * @param {Object} config.businessHandlers  An object
	 * @param {Object} config.translations      An object containing the translations
	 * @param {Number} config.FIRST_WEEKDAY     0 = Sunday, 1 = Monday (other values not recommended)
	 * @constructor
	 */
	class CalendarWidget {
		constructor(config) {
			this.selectedDay = {
				year: undefined,
				month: undefined,
				dayOfMonth: undefined,
				date: undefined,
			};
			let FIRST_WEEKDAY = parseInt(config.FIRST_WEEKDAY);
			if (FIRST_WEEKDAY === undefined) {
				FIRST_WEEKDAY = 1;
			}
			this.FIRST_WEEKDAY = FIRST_WEEKDAY;
			this.initDom();
		}

		/**
		 * Returns the index of the weekday (accounting for the defined start of week)
		 * @param date  Date
		 */
		getNormalizedWeekDay(date) {
			// getDay() returns 0 for Sunday, 1 for Monday, etc. until 6 for Saturday;
			// if our defined FIRST_WEEKDAY is Tuesday (2), then we want to return 0
			// for Tuesday, 1 for Wednesday, etc.
			return (date.getDay() + (7 - this.FIRST_WEEKDAY)) % 7;
		}

		/**
		 * @param {number} index
		 * @return {string}  Translation key for the name of the weekday
		 *                   the specified index
		 */
		getWeekDayName(index) {
			return STD_WEEK[(index + FIRST_WEEKDAY) % 7];
		}

		initDom(id = '') {
			this.domHandlerTrackers = new Map();
			const mainDiv = this.mainDiv = newElement(
				'div',
				{
					className: 'cal-view',
					id: id,
				}
			);
			const monthPane = this.monthPane = newElement(
				'div',
				{
					className: 'cal-month-pane',
				},
				mainDiv
			);
			const calNavDiv = this.calNavDiv = newElement(
				'div',
				{
					className: 'cal-nav',
				},
				monthPane
			);
			newElement(
				'span',
				{
					className: 'btn jump-months prev-year  fas fa-backward',
					data: {monthDelta: "-12"},
				},
				calNavDiv
			);
			newElement(
				'span',
				{
					className: 'btn jump-months prev-month fas fa-step-backward',
					data: {monthDelta: "-1"},
				},
				calNavDiv
			);
			newElement(
				'span',
				{
					className: 'cal-month-title',
				},
				calNavDiv
			);
			newElement(
				'span',
				{
					className: 'btn jump-months next-month fas fa-step-forward',
					data: {monthDelta: "1"},
				},
				calNavDiv
			);
			newElement(
				'span',
				{
					className: 'btn jump-months next-year  fas fa-forward',
					data: {monthDelta: "12"},
				},
				calNavDiv
			);
			newElement(
				'div',
				{
					className: 'cal-month'
				},
				mainDiv
			);
			this.rightPane = newElement(
				'div',
				{
					className: 'cal-right-pane'
				},
				mainDiv
			);
			this.bottomPane = newElement(
				'div',
				{
					className: 'cal-bottom-pane'
				},
				mainDiv
			);
		}

		/**
		 * This is where the magic happens.
		 * Returns 
		 * @param year
		 * @param month
		 */
		showMonth(year, month) {
			if (month > 11) {
				year += int(month / 12);
				month = int(month) % 12;
			} else if (month < 0) {
				year += int(month / 12);
				month = mod(int(month), 12);
			}
			this.selectedDay.year = year;
			this.selectedDay.month = month;
			this.curMonthData = this.businessHandlers.monthData;
			
			let firstDay = new CalendarWidgetDate(
				year,
				month,
				1,
				0,
				0,
				0
			);

			// first day of next month
			let lastDay = new CalendarWidgetDate(
				(month === 11) ? year + 1 : year,
				(month === 11) ? 0 : month + 1,
				1,
				0,
				0,
				0
			);
			lastDay.setPrevDay(); // set back 1 day

			let weekDay = normalizeWeekDay(firstDay);

			// number of days that will be shown from the previous month
			let nbDaysBeforeMonthStart = weekDay;

			$(calRootDiv.querySelector('.month-title')).html('' + STD_MONTH[month] + ' ' + year);

			let table = newElement('table', {}, this.monthPane);
			let colgroup = newElement('colgroup', {className: 'main-columns'}, table);
			let endColgroup = newElement('colgroup', {className: 'end-columns'}, table);
			let thead = newElement('thead', table);
			let tbody = newElement('tbody', table);
			let tr = newElement('tr', {}, thead);

			for (let i = 0; i < 7; i++) {
				let th = newElement('th', {}, tr);
				th.innerText = this.getWeekDayName(i);
				newElement('col', {className: 'weekday-column'}, colgroup);
			}
			let aggregateTh = newElement('th', {}, tr);
			aggregateTh.innerText = businessHandlers.getAggregateColTitle();
			newElement('col', {className: 'aggregate-column'}, endColgroup);

			let day = new CalendarWidgetDate(year, month, 1);
			day.goBackXDays(nbDaysBeforeMonthStart); // first day that will be shown

			let fromNext, fromPrev;
			let monthData = [];
			this.TDayTd = {}; // clear the dictionary of <td> representing days of month
			// loop over 6 weeks
			for (let weekN = 0; weekN < 6; weekN++) {
				tr = newElement('tr', {}, tbody);
				let weekData = [];
				for (let weekDayN = 0; weekDayN < 7; weekDayN++) {
					fromPrev = day < firstDay;
					fromNext = day > lastDay;
					let dayData = businessHandlers.getDayData(day);
					let td = this.getHTMLElementForDay(day, dayData, year, month);
					this.TDayTd[day.getYMDString()] = td;
					if (day.getYMDString() === this.curSelectedDate) {
						td.classList.add('selected');
					}
					weekData.push(dayData);
					monthData.push(dayData);
					day.goForwardXDays(1);
				}
				let weekAggregateTd = newElement('td', {className: 'week-aggregate'}, tr);
				weekAggregateTd.innerHTML = businessHandlers.getWeekAggregateCellInfo(weekData);
			}
			tr = newElement('tr', {}, tbody);
			let td = newElement('td', {className: 'month-aggregate', colspan: "8"}, tr);
			td.innerHTML = businessHandlers.getMonthAggregateInfo(monthData);
			this.makeNavButtonsClickable(year, month);
			this.updatePanes();
		}
		
		getRelativeMonthJumpCallback(year, month) {
			while (month < 0) {
				year--;
				month += 12;
			}
			while (month > 11) {
				year++;
				month -= 12;
			}
			let getCbMonthJump = (year, monthNb) => {
				return () => this.ajaxLoadMonth(year, monthNb);
			};
			return getCbMonthJump(year, month);
		}
		
		makeNavButtonsClickable(year, month) {
			for (let button of this.calNavDiv.querySelector('.btn.jump-month')) {
				let monthDelta = parseInt(button.getAttribute('data-monthDelta'));
				let handler = this.domHandlerTrackers.get(button);
				if (handler) {
					button.removeEventListener('click', handler);
				}
				button.
				$btn.unbind();
				$btn.click(getRelativeMonthJumpCallback(year, month + monthDelta));
			}
		}
		
		getHTMLElementForDay() {
			
		}

		updatePanes() {
			
		}

		getBusinessDataForMonth() {
			
		}
	}
	// CalendarWidget.prototype.normalizeWeekDay = (date) => {
	//	
	// };
	
	
// TODO: [ ] se débarrasser du squelette HTML (calendar-month-view.inc.php) pour que la classe génère
//       ses propres éléments (comme ça, si une page veut avoir plusieurs calendriers, pas besoin
//       de leur créer un squelette à chaque fois : on pointe juste la div qu’on veut transformer
//       en calendrier). Et puis moins il y a de *.inc.php, mieux on se porte, franchement.
// TODO: [x] namespace JS pour éviter un potentiel conflit de nommage avec une lib qui définirait
//       'CalendarWidget' ou 'makeCal';
// TODO: [ ] mettre CalendarWidget dans une lib séparée pour le rendre facilement réutilisable
// TODO: [ ] renommer les classes CSS pour supprimer "v" là où ce n’est pas de la logique client
// TODO: [ ] faire de la classe CalendarWidget une classe plus classique (transformer des closures en
//       méthodes + des variables liées en propriétés)
// TODO: [ ] utiliser une technique plus lente mais plus sûre pour avancer/reculer d’un jour
//       (par exemple en recréant une date avec parsing de chaîne de caractères)
// TODO: [x] permettre d’importer les traductions (pour les noms des mois etc.) dans "config"
// TODO: [ ] mécanisme de substitution dans les traductions
// TODO: [x] supprimer de showMonth l’affichage spécifique à la saisie des temps et le mettre dans un
//       callback passé au calendrier: ainsi, on pourra facilement réutiliser le composant
//       calendrier pour afficher autre chose que de la saisie de temps.
// TODO: [x] ligne de total dans le calendrier (total des saisies du mois)
// TODO: [ ] accessibilité: date complète dans alt text, infobulles, etc.

	/**
	 * Turns a div (with appropriate structure) into a dynamic calendar for logging hours spent on
	 * tasks.
	 *
	 * @param {Object} config  Object with the following keys:
	 *    htmlId: string: the ID of the root <div> which will be our calendar widget
	 * @param {Object} businessHandlers  Collection of methods to handle business data:
	 *                 - getDayData()               -> tells the calendar what business data is relevant for a particular day
	 *                 - getDayCellInfo()           -> tells the calendar what to put below the day of the month in the day cells of the month view
	 *                 - getWeekAggregateCellInfo() -> tells the calendar what to put in the last column (ex: total for week, or average, or anything)
	 *                 - getAggregateColTitle()     -> tells the calendar what title to put in the <th> for the last column (ex: TOTAL, AVERAGE, ……)
	 *                 - getRightPaneContent()      -> tells the calendar what to display in the right pane when a day is clicked
	 *                 - getBottomPaneContent()     -> tells the calendar what to display in the bottom pane when a day is clicked
	 */
	let CalendaiiiiiiiiiirWidget = function (config, businessHandlers) {
		let self = this; // inutile aujourd’hui
		businessHandlers.init(self);
		TRANS.init(config.translations);
		self.config = config;
		self.curYear = undefined;
		self.curMonth = undefined;
		self.curDay = undefined;
		self.curMonthData = undefined;
		self.curSelectedDate = undefined;
		// convert to integer
		let int = function (i) {
			return (~~i);
		};
		// modulo that works with negative numbers (javascript's "%" operator is not exactly modulo)
		let mod = function (a, b) {
			return ((a % b) + b) % b;
		};

		let DAY_MILLISEC = 24 * 60 * 60 * 1000 // 24 hours of 60 minutes of 60 seconds of 1000 milliseconds each
		// pitfall: transition days between daylight saving time and standard time CAN last more or less than 24 hours.

		let FIRST_WEEKDAY = parseInt(config.FIRST_WEEKDAY);
		if (FIRST_WEEKDAY === undefined) FIRST_WEEKDAY = 1; // 0 = Sunday; 1 = Monday; ……… 6 = Saturday

		let STD_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		let STD_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		STD_WEEK = STD_WEEK.map((val) => TRANS.trans(val));
		STD_MONTH = STD_MONTH.map((val) => TRANS.trans(val));

		let calRootDiv = document.querySelector('#' + config.htmlId);

		let nav = calRootDiv.querySelector('.v-cal-nav');
		let $TNavBtns = $(nav).find('.btn.jump-months');

		/**
		 * Returns the index of the weekday (accounting for the defined start of week)
		 * @param date  Date
		 */
		let normalizeWeekDay = function (date) {
			// getDay() returns 0 for Sunday, 1 for Monday, etc. until 6 for Saturday;
			// if our defined FIRST_WEEKDAY is Tuesday (2), then we want to return 0 for Tuesday, 1 for Wednesday, etc.
			return (date.getDay() + (7 - FIRST_WEEKDAY)) % 7;
		};

		let weekDayName = function (index) {
			return STD_WEEK[(index + FIRST_WEEKDAY) % 7];
		};

		/**
		 * Affiche un calendrier du mois passé en paramètre (mois: 0-11 / année);
		 * businessData est un objet (retour json) au format arbitraire: les méthodes de l’objet businessHandlers sont appelées
		 * pour en tirer des éléments HTML à afficher (comme ça on sépare le métier "affichage de calendrier" et le métier client)
		 *
		 * @param year    full year
		 * @param month (⚠ month: 0=January to 11=December) DON'T FORGET TO ADD/SUBSTRACT 1
		 */
		let showMonth = function (year, month) {
		};
		self.showMonth = showMonth;

		/**
		 * Returns a callback for ajaxLoadMonth(year, month); if month is not in [0-11], year/month will be adjusted
		 * @param {int} year
		 * @param {int} month
		 */
		let getRelativeMonthJumpCallback = function (year, month) {
		};

		/**
		 * Turns on the "player" buttons (month / year forward / backward)
		 * @param {int} year
		 * @param {int} month
		 */
		let makeNavBtnsClickable = function (year, month) {
		};

		/**
		 * Retourne un <td> wrappé par jQuery mais ajoute des événements et remplit le <td> avec des infos de dayData "décodées" par
		 * businessHandlers. Ce <td> représente un jour (+ des infos de logique métier) dans le tableau du calendrier du mois.
		 * Ce <td> est cliquable : si le jour fait partie du mois demandé, ça charge les panneaux de droite et du bas; si le jour fait
		 * partie du mois précédent/suivant, ça charge le mois précédent/suivant et sélectionne le jour donné.
		 *
		 * @param {Date} day
		 * @param {Object} dayData
		 * @param {int} curYear
		 * @param {int} curMonth
		 * @returns {Object} A jQuery <td> element bound to the specified day:
		 *                   clicking will select the month / day + load info related to the day
		 */
		let getTdOfDay = function (day, dayData, curYear, curMonth) {
			// TODO: supprimer le paramètre dayData, déplacer une partie du traitement côté businessHandlers, supprimer
			//       businessHandlers.getDayData qui deviendra inutile.
			day = new Date(day); // break tie by cloning the date object
			let dayYear = day.getFullYear(), dayMonth = day.getMonth(), dayDate = day.getDate();
			let isFromCurMonth = (curYear === dayYear && curMonth === dayMonth),
				isFromPrevMonth = (curYear > dayYear) || (curYear === dayYear && curMonth > dayMonth),
				isFromNextMonth = (curYear < dayYear) || (curYear === dayYear && curMonth < dayMonth);
			let tdClass = isFromNextMonth ? 'from-next-month' : (isFromPrevMonth ? 'from-prev-month' : 'from-cur-month');
			let $td = $('<td class="day">');
			if (tdClass) $td.addClass(tdClass);
			let $innerDiv = $('<div>');
			let $calDay = $('<div class="day-of-month">');
			let $business = $('<div class="business-data">');
			$td.append($innerDiv);
			$innerDiv.append($calDay).append($business);
			$calDay.html(day.getDate());
			if (isFromCurMonth) {
				// call business handler for client-specific logic (enables easy repurposing of the calendar by just replacing business handlers and ajax endpoint)
				$business.html(businessHandlers.getDayCellInfo(dayData, day));
			} else {
				$business.html(' ');
			}
			$td.click(function () {
				self.curSelectedDate = self.getDayKey(day);
				self.curYear = day.getFullYear();
				self.curMonth = day.getMonth();
				self.curDay = day.getDate();
				if (isFromCurMonth) {
					// TODO: extract function (duplicated code + unclean)!!
					$(calRootDiv).find('td.selected').removeClass('selected');
					$td.addClass('selected');
					self.updatePanes();
				} else {
					ajaxLoadMonth(day.getFullYear(), day.getMonth());
				}
			});
			return $td;
		};

		self.updatePanes = function () {
			let selectedDay, dayData;
			if (self.curSelectedDate) {
				selectedDay = new Date(self.curSelectedDate);
				dayData = businessHandlers.getDayData(selectedDay);
			} else {
				selectedDay = undefined;
				dayData = undefined;
			}
			$(calRootDiv.querySelector('.v-cal-right-pane')).html(
				businessHandlers.getRightPaneContent(dayData, selectedDay)
			);
			$(calRootDiv.querySelector('.v-cal-bottom-pane')).html(
				businessHandlers.getBottomPaneContent(dayData, selectedDay)
			);
		}

		/**
		 * Loads business data for the selected month and calls showMonth()
		 *
		 * @param {int} year
		 * @param {int} month
		 */
		let ajaxLoadMonth = function (year, month) {
			// ajax call
			businessHandlers.ajaxGetMonthData(year, month).done(
				function (data) {
					if (data.error) {
						$.jnotify(TRANS.trans('EndPointError') + ' : ' + data.error, 'error', true);
						return;
					}
					businessHandlers.monthData = data.payload;
					showMonth(year, month);
				}
			);
		};

		ajaxLoadMonth(config.year, config.month);
	};


	/**
	 * Collection of methods used to "decode" business data returned by the endpoint "interface.php".
	 * These are the methods for v.
	 * You can customize the interpretation of ajax-loaded data here without modifying CalendarWidget.
	 */
	let vBusinessHandlers = {
		/** @var {CalendarWidget} cal */
		cal: null,
		monthData: {}, // cached month data (for client-side updates)
		/**
		 * @param {CalendarWidget} cal
		 */
		init: function (cal) {
			this.cal = cal;
		},
		/**
		 *
		 * @param {Object} businessData
		 * @param {Date} day
		 */
		getDayData: function (day) {
			// for v
			let dayData = this.monthData.loggedTimes[this.cal.getDayKey(day)];
			if (dayData === undefined) {
				dayData = [];
			}
			dayData.projects = this.monthData.projects;
			return dayData;
		},
		/**
		 *
		 * @param {Object} dayData
		 * @param {Date} day
		 */
		getDayCellInfo: function (dayData, day) {
			// for v
			let sum = 0;
			for (let i = 0; i < dayData.length; i++) {
				let timeObj = dayData[i];
				if (timeObj) sum += timeObj.task_duration;
			}
			return this._formatTimeSeconds(sum, (dayData.length > 0));
		},

		/**
		 *
		 * @param {Object} weekData
		 */
		getWeekAggregateCellInfo: function (weekData) {
			// for v: just a sum
			let sum = 0;
			let nonEmptyZero = false;
			for (i = 0; i < weekData.length; i++) {
				let dayData = weekData[i];
				nonEmptyZero |= (dayData.length > 0);
				for (let j = 0; j < dayData.length; j++) {
					if (dayData[j]) sum += dayData[j].task_duration;
				}
			}
			// let sum = weekData.reduce((acc, val) => acc + val, 0);

			// si la somme fait 0 mais qu'il y a des entrées (pour les notes), on affiche le zéro
			nonEmptyZero &= (sum === 0);
			sum = this._formatTimeSeconds(sum, nonEmptyZero);
			return $('<div>' + (sum ? sum : '') + '</div>');
		},

		/**
		 *
		 * @param {Object} monthData
		 */
		getMonthAggregateInfo: function (monthData) {
			// for v: just a sum
			let sum = 0;
			for (i = 0; i < monthData.length; i++) {
				let dayData = monthData[i];
				for (let j = 0; j < dayData.length; j++) {
					if (dayData[j]) sum += dayData[j].task_duration;
				}
			}
			// let sum = weekData.reduce((acc, val) => acc + val, 0);

			// si la somme fait 0 mais qu'il y a des entrées (pour les notes), on affiche le zéro 
			sum = this._formatTimeSeconds(sum, true);
			return $('<div>' + TRANS.trans('MonthTotal') + ': ' + (sum ? sum : '0') + '</div>');
		},

		/**
		 *
		 */
		getAggregateColTitle: function () {
			return TRANS.trans('TOTAL');
		},

		/**
		 *
		 * @param {Object} dayData
		 * @param {Date} day
		 */
		getRightPaneContent: function (dayData, day) {
			let $form,
				$fieldset,
				$projectLabel,
				$projectSelect,
				$taskLabel,
				$taskSelect,
				$timeLabel,
				$timeInput,
				$noteLabel,
				$noteInput,
				$dateInput,
				$timeIdInput,
				$btnSubmit;
			$form = $('<form method="post">');
			$fieldset = $('<fieldset>');
			if (!day) {
				$fieldset.attr('disabled', 'disabled');
			}
			$form.append($fieldset);

			// structure du formulaire : 4 champs de saisie dans 4 labels

			$projectLabel = $('<label>' + TRANS.trans('Project') + ':</label>');
			$projectSelect = $('<select name="project-select" required>');
			$projectSelect.append('<option value=""></option>');
			$projectLabel.append($projectSelect);
			let select2Options = {};
			if (!day) select2Options.disabled = true;
			$projectSelect.select2(select2Options);

			$taskLabel = $('<label>' + TRANS.trans('Task') + ':</label>');
			$taskSelect = $('<select name="task-select" required>');
			$taskLabel.append($taskSelect);
			$taskSelect.select2(select2Options);

			$timeLabel = $('<label title="' + TRANS.trans('HoursInputHelp') + '">' + TRANS.trans('Hours') + ':</label>');
			$timeInput = $('<input type="text" placeholder="'
				+ TRANS.trans('HoursInputPlaceholder')
				+ '" pattern="24$|([01]?\\d|2[0-3])([\\.,]\\d+|:(00|15|30|45))?$" name="duration">'
			);
			$timeLabel.append($timeInput);

			$noteLabel = $('<label>' + TRANS.trans('Notes') + ':</label>');
			$noteInput = $('<textarea name="note">');
			$noteLabel.append($noteInput);

			$btnSubmit = $('<button class="butAction">' + TRANS.trans('SubmitTime') + '</button>');

			$dateInput = $('<input type="hidden" name="date" value="' + (day ? this.cal.getDayKey(day) : '') + '">');
			$timeIdInput = $('<input type="hidden" name="fk_time" value="">');

			this.$projectSelect = $projectSelect;
			this.$taskSelect = $taskSelect;
			this.$timeInput = $timeInput;
			this.$noteInput = $noteInput;
			this.$dateInput = $dateInput;
			this.$timeIdInput = $timeIdInput;

			// on ajoute le tout au formulaire
			$fieldset
				.append($timeIdInput)
				.append($dateInput)
				.append($projectLabel)
				.append($taskLabel)
				.append($timeLabel)
				.append($noteLabel)
			;
			$form.append($btnSubmit);

			// détails des input (options des select, événements)
			if (dayData !== undefined) {
				for (let projectType in dayData.projects) {
					if (!dayData.projects.hasOwnProperty(projectType)) continue;
					let $optGroup = $('<optgroup label="' + projectType + '">');
					let TProject = dayData.projects[projectType];
					TProject.forEach((project) => {
						let $opt = $('<option value="' + parseInt(project.id) + '">'
							+ project.ref + ' (' + project.title + ')'
							+ '</option>');
						$optGroup.append($opt);
					});
					$projectSelect.append($optGroup);
				}
			}

			$projectSelect.change((ev, fk_task) => this._cbProjectSelectChange(ev, fk_task));
			if (window.CKEDITOR && day) {
				CKEDITOR.replace(
					$noteInput[0],
					// override default configuration with minimal options because
					// there isn't enough space for a full-fledged CKEditor
					{
						toolbar: [
							{name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike']},
							{name: 'paragraph', items: ['NumberedList', 'BulletedList']},
						],
						removePlugins: 'elementspath',
						removeButtons: 'Subscript,Superscript',
						resize_enabled: false,
					}
				);
			}

			$form.submit((ev) => this._cbSubmitTimeSpent(ev));

			return $form;
		},

		/**
		 *
		 * @param {Object} dayData
		 * @param {Date} day
		 */
		getBottomPaneContent: function (dayData, day) {
			let $list = $('<ul>');
			if (dayData !== undefined) {
				dayData.forEach((obj) => {
					let faClass = this.cal.config.faClass;
					let $li = $('<li>');
					$li.append(
						'<p class="task-time-and-desc">'
						+ '<b>[' + this._formatTimeSeconds(obj.task_duration, true) + ']</b> '
						+ obj.link_to_task
						+ ' - '
						+ obj.task_label
						+ '</p>'
						+ '<p> <b>' + TRANS.trans('Project') + ':</b> ' + obj.link_to_project + '</p>'
					);
					if (obj.note) {
						let $noteDiv = $('<div class="note">' + obj.note + '</div>');
						$li.append($noteDiv);
					}
					this.activateRichTooltips($li);
					let $cornerBtns = $('<span class="corner-buttons">');

					let $editBtn = $('<span class="btn ' + faClass + ' fa-edit">');
					$editBtn.click((ev) => this._cbEditTimeSpent(ev, obj));
					$cornerBtns.append($editBtn);

					let $deleteBtn = $('<span class="btn ' + faClass + ' fa-trash">');
					$deleteBtn.click((ev) => this._cbDeleteTimeSpent(ev, obj.task_time_id));
					$cornerBtns.append($deleteBtn);

					$li.append($cornerBtns);
					$list.append($li);
				});
			}
			return $list;
		},

		activateRichTooltips: function ($parent) {
			$parent.find('.classfortooltip').tooltip({
				show: {
					collision: 'flipfit',
					effect: 'toggle',
					delay: 50
				},
				hide: {delay: 50},
				tooltipClass: 'mytooltip',
				content: function () {
					return $(this).prop('title');
				}
			});
		},

		/**
		 * Turns a duration in seconds into a string formatted like "HH:MM".
		 * @param {int} seconds
		 * @param {bool} showZero  If false, return empty string instead of '00:00'
		 */
		_formatTimeSeconds: function (seconds, showZero) {
			if (!~~seconds && !showZero) return ' ';
			let h = '' + ~~(seconds / 3600);
			if (h.length < 2) h = '0' + h;
			seconds %= 3600;
			let m = '' + ~~(seconds / 60);
			if (m.length < 2) m = '0' + m;
			seconds %= 3600;
			return h + ':' + m;
		},

		/**
		 * Converts a string representing hours into a number of seconds.
		 * If the string has a colon (:) in it, the right part is considered to be minutes.
		 * If the string has a dot (.) in it, the right part is considered to be a decimal fraction of an hour
		 * TODO: account for configured decimal separator (comma for instance)
		 * @param {string} durationString
		 * @returns {int} time spent in seconds
		 * @private
		 */
		_parseDuration: function (durationString) {
			// conversion en secondes
			if (durationString === '') return 0;
			durationString = durationString.replace(',', '.');
			let m = durationString.match(/^\d+(?:\.\d+)?$/);
			if (m) return ~~(parseFloat(m) * 3600);
			m = durationString.match(/^(\d+):(\d+)$/);
			if (m) return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60;
			return NaN;
		},

		/**
		 * Recharge les données du jour sélectionné et actualise l’affichage
		 * @private
		 */
		_reloadDay: function () {
			this.ajaxGetDayData(this.cal.curYear, this.cal.curMonth, this.cal.curDay).done(
				(data) => {
					this.monthData.loggedTimes[this.cal.curSelectedDate]
						= data.payload.loggedTimes[this.cal.curSelectedDate];
					this.cal.showMonth(this.cal.curYear, this.cal.curMonth, this.cal.curMonthData);
				}
			);
		},

		/**
		 *
		 * @param {Event} ev
		 */
		_cbSubmitTimeSpent: function (ev) {
			//let projectId = this.$projectSelect.val();
			let self = this;

			// if CKEditor is being used, flush CKEditor content to the actual textarea
			// (because 
			if (window.CKEDITOR !== undefined) {
				for (var instanceName in CKEDITOR.instances) {
					CKEDITOR.instances[instanceName].updateElement();
				}
			}

			let fk_task = this.$taskSelect.val();
			let fk_time = this.$timeIdInput.val();
			let durationSeconds = this._parseDuration(this.$timeInput.val());
			let note = this.$noteInput.val();
			let date = this.$dateInput.val();
			this.ajaxPostTime(fk_time, fk_task, durationSeconds, note, date).done(
				function (data) {
					if (data.error) {
						$.jnotify(TRANS.trans('EndPointError') + ' : ' + data.error, 'error', true);
						return;
					}
					self._reloadDay();
				}
			);

			ev.preventDefault();
			return false;
		},

		/**
		 * Sends an ajax query to delete a logged time from a task
		 * @param {Event} ev
		 * @param {int} fk_task_time  ID of the logged time to be deleted
		 */
		_cbDeleteTimeSpent: function (ev, fk_task_time) {
			let self = this;
			if (!window.confirm(TRANS.trans('DeleteLoggedTime'))) return;
			this.ajaxPostDeleteTime(fk_task_time).done(
				function (data) {
					if (data.error) {
						$.jnotify(TRANS.trans('EndPointError') + ' : ' + data.error, 'error', true);
						return;
					}
					self._reloadDay();
				}
			);
		},

		_cbEditTimeSpent: function (ev, obj) {
			this.$timeIdInput.val(obj.task_time_id);

			this.$projectSelect.val(obj.fk_project);
			this.$projectSelect.trigger('change', obj.fk_task);
			this.$projectSelect.attr('disabled', true);
			this.$taskSelect.attr('disabled', true);

			let durationText = this._formatTimeSeconds(obj.task_duration, true);
			this.$timeInput.val(durationText);

			this.$noteInput.val(obj.note);
			if (window.CKEDITOR) {
				CKEDITOR.instances['note'].setData(obj.note);
			}
		},

		/**
		 *
		 * @param {Event} ev
		 * @param {int} fk_task  Will preselect the task (the task must belong to the project)
		 * @private
		 */
		_cbProjectSelectChange: function (ev, fk_task) {
			let self = this;
			this.ajaxGetProjectTasks(ev.target.value).done(
				function (data) {
					if (data.error) {
						$.jnotify(TRANS.trans('EndPointError') + ' : ' + data.error, 'error', true);
						return;
					}
					self.$taskSelect.html('<option value=""></option>');
					data.payload.forEach(function (task) {
						self.$taskSelect.append('<option value="' + task.id + '">' + task.ref + ' ' + task.label + '</option>');
					});
					self.$taskSelect.select2();
					if (fk_task) {
						self.$taskSelect.val(fk_task);
						self.$taskSelect.trigger('change');
					}
				}
			);
		},

		/**
		 *
		 * @param {int} fk_project
		 * @returns {void|*}
		 */
		ajaxGetProjectTasks: function (fk_project) {
			return this.xhr({
				'data': {
					'get': 'project-tasks',
					'fk_project': fk_project
				}
			});
		},

		/**
		 *
		 * @param {int} year
		 * @param {int} month
		 * @returns {void|*}
		 */
		ajaxGetMonthData: function (year, month) {
			return this.xhr({
				'data': {
					'get': 'month-data',
					'year': year,
					'month': month,
				}
			});
		},

		ajaxGetDayData: function (year, month, day) {
			return this.xhr({
				'data': {
					'get': 'day-data',
					'year': year,
					'month': month,
					'day': day,
				}
			});
		},

		ajaxPostTime: function (fk_time, fk_task, duration, note, date) {
			return this.xhr({
				'method': 'post',
				'data': {
					'post': 'time-spent',
					'fk_time': fk_time,
					'fk_task': fk_task,
					'duration': duration,
					'note': note,
					'date': date,
				}
			});
		},

		ajaxPostDeleteTime: function (fk_task_time) {
			return this.xhr({
				'method': 'post',
				'data': {
					'post': 'delete-time-spent',
					'fk_time': fk_task_time,
				}
			});
		},

		/**
		 * Just a helper that puts default values for request.method and request.url
		 * and adds a default handler for failure
		 * @param request
		 * @param method
		 * @param url
		 * @returns {XMLHttpRequest} (XHR possibly wrapped by jQuery)
		 */
		xhr: function (request, method, url) {
			// priorité: paramètre method > request.method > defaut ('get')
			if (method) request.method = method;
			else if (!request.method) request.method = 'get';
			// priorité: paramètre url > request.url > defaut
			if (url) request.url = url;
			else if (!request.url) request.url = this.cal.config.ajaxEndPoint;
			let xhr = $.ajax(request);
			xhr.fail(function (xhr, error, message) {
				alert('Ajax error: ' + xhr.status + ' (' + message + ')');
			});
			return xhr;
		},
	};

	/**
	 *
	 * @param {Object} config
	 */
	let makeCal = function (config) {
		return new CalendarWidget(config, vBusinessHandlers);
	};

	let TRANS = {
		init(translations) {
			this.translations = translations;
		},
		trans(key) {
			if (this.translations[key] === undefined) return key;
			return this.translations[key];
		},
		transReplaceSimple(key) {
			// TODO
			let args = Array.from(arguments);
			args.shift();

		}
	}

})();
