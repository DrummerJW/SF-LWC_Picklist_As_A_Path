//Title:          picklistAsAPath
//Details:        LWC to display and edit a picklist field as a path on Record Pages.
//Author:         Joshua Withers
//Github:         https://github.com/DrummerJW
//Version:        1.0

import { LightningElement, api, wire } from 'lwc';
import { getObjectInfo, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


export default class PicklistAsAPath extends LightningElement {
	@api recordId;
	@api objectApiName;
	@api field; 
	@api closedLabel; 
	@api updateButtonHidden; 
	@api confettiOnClose;
	@api confettiDurationSeconds;

	objectInfo;
	record;
	picklistValues = [];
	selectedStepValue;
	recordTypeId;
	errorMsg;
	_confettiTimer;
	_confettiAnimation;
	_confettiPieces = [];
	_confettiRunning = false;
	_globalConfettiCanvas;

	labels = {
		genericError: 'An unexpected error occurred. Contact your administrator.',
		updateTo: 'Update to'
	};

	/* ============== Utility / Toasts ============== */
	_showToast({ title, message, variant = 'error' }) {
		try {
			this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
		} catch (e) {
		}
	}

	_handleWireError(error, contextMsg) {
		const detail = this._extractError(error);
		this.errorMsg = detail;
		this._showToast({ title: contextMsg || 'Error', message: detail, variant: 'error' });
	}

	@wire(getRecord, { recordId: '$recordId', layoutTypes: ['Full'], modes: ['View'] })
	wiredRecord({ data, error }) {
		if (error) {
			this._handleWireError(error, 'Load Record Failed');
			return;
		}
		if (data) {
			this.record = data;
			this.recordTypeId = data.recordTypeId;
		}
	}

	@wire(getObjectInfo, { objectApiName: '$objectApiName' })
	wiredInfo({ data, error }) {
		if (error) {
			this._handleWireError(error, 'Load Object Info Failed');
			return;
		}
		if (data) {
			this.objectInfo = data;
			if (!this.recordTypeId) this.recordTypeId = data.defaultRecordTypeId;
		}
	}

	@wire(getPicklistValuesByRecordType, { objectApiName: '$objectApiName', recordTypeId: '$recordTypeId' })
	wiredPicklists({ data, error }) {
		if (error) {
			this._handleWireError(error, 'Load Picklist Values Failed');
			return;
		}
		if (data && data.picklistFieldValues && data.picklistFieldValues[this.field]) {
			this.picklistValues = data.picklistFieldValues[this.field].values.map((v, i) => ({
				value: v.value,
				label: v.label,
				index: i
			}));
		} else if (data && this.field) {
			const msg = `Field '${this.field}' is not a picklist or has no values for this Record Type.`;
			this.errorMsg = msg;
			this._showToast({ title: 'Picklist Field Error', message: msg });
		}
	}

	get isLoaded() {
		return !!(this.record && this.objectInfo && this.picklistValues.length);
	}

	get picklistFieldLabel() {
		if (!this.objectInfo || !this.field) return this.field;
		return this.objectInfo.fields?.[this.field]?.label || this.field;
	}

	get currentValue() {
		return this.record?.fields?.[this.field]?.value;
	}

	get currentIndex() {
		return this.picklistValues.findIndex((s) => s.value === this.currentValue);
	}

	get selectedStep() {
		return this.picklistValues.find((s) => s.value === this.selectedStepValue);
	}

	get isClosed() {
		return this.closedLabel && this.currentValue === this.closedLabel;
	}

	get nextStep() {
		const idx = this.currentIndex;
		if (idx === -1) return undefined;
		return this.picklistValues[idx + 1];
	}

	get steps() {
		const current = this.currentValue;
		const selected = this.selectedStepValue;
		return this.picklistValues.map((s) => {
			let cls = 'slds-path__item';
			const isCurrent = s.value === current;
			const isSelected = selected && s.value === selected;
			const isBefore = this._isBefore(s.value, current);
			if (isCurrent) cls += ' slds-is-current';
			if (isSelected || (!selected && isCurrent)) cls += ' slds-is-active';
			if (isBefore && !isCurrent) cls += ' slds-is-complete';
			if (!isBefore && !isCurrent) cls += ' slds-is-incomplete';
			return { ...s, classText: cls };
		});
	}

	get updateButtonText() {
		if (this.selectedStep && this.selectedStep.value !== this.currentValue) {
			return `${this.labels.updateTo} ${this.selectedStep.label}`;
		}
		if (this.isClosed) return 'Mark Status as Complete';
		if (this.nextStep) return 'Mark Status as Complete';
		return '';
	}

	get isUpdateDisabled() {
		if (this.isClosed && !this.selectedStepValue) return true;
		if (this.selectedStepValue && this.selectedStepValue === this.currentValue) return true;
		if (!this.selectedStepValue && !this.nextStep) return true;
		return false;
	}

	get showButton() {
		if (this.updateButtonHidden) return false;
		if (this.isClosed) return true;
		if (this.selectedStepValue && this.selectedStepValue !== this.currentValue) return true;
		if (this.nextStep) return true;
		return false;
	}

	get genericErrorMessage() {
		return this.labels.genericError;
	}

	get hasToShowSpinner() {
		return this.spinner || !this.isLoaded;
	}

	/* ================= Events ================= */
	handleStepSelected(event) {
		const value = event.currentTarget.getAttribute('data-value');
		if (value === this.currentValue) {
			this.selectedStepValue = undefined; // toggle off if clicking current
		} else if (value === this.selectedStepValue) {
			this.selectedStepValue = undefined; // unselect
		} else {
			this.selectedStepValue = value;
		}
	}

	handleUpdateButtonClick() {
		if (this.isUpdateDisabled) return;
		let targetValue = this.selectedStepValue;
		if (!targetValue) {
			// Fallback to next step when no explicit selection
			if (this.nextStep) targetValue = this.nextStep.value;
		}
		if (!targetValue || targetValue === this.currentValue) return;
		this._updateRecord(targetValue);
	}

	/* ================= Helpers ================= */
	_isBefore(valA, valB) {
		if (!valA || !valB) return false;
		const idxA = this.picklistValues.findIndex((s) => s.value === valA);
		const idxB = this.picklistValues.findIndex((s) => s.value === valB);
		return idxA > -1 && idxB > -1 && idxA < idxB;
	}

	_updateRecord(value) {
		if (!this.field) {
			const msg = 'Picklist field not specified.';
			this.errorMsg = msg;
			this._showToast({ title: 'Configuration Error', message: msg });
			return;
		}
		this.spinner = true;
		const recordInput = { fields: { Id: this.recordId } };
		recordInput.fields[this.field] = value;
		updateRecord(recordInput)
			.then(() => {
				this.dispatchEvent(
					new ShowToastEvent({
						message: `${this.picklistFieldLabel} updated to ${value}.`,
						variant: 'success'
					})
				);
				if (this.confettiOnClose && this.closedLabel && value === this.closedLabel) {
					this._launchConfetti();
				}
			})
			.catch((e) => {
				this.errorMsg = this._extractError(e);
				this._showToast({ title: 'Update Failed', message: this.errorMsg });
			})
			.finally(() => {
				this.spinner = false;
				this.selectedStepValue = undefined;
			});
	}

	_launchConfetti() {
		if (this._confettiRunning) return; // prevent overlapping runs
		// Respect reduced motion preference
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (typeof document === 'undefined') return; // SSR / safety guard
		this._confettiRunning = true;
		const secondsRaw = Number(this.confettiDurationSeconds);
		const seconds = !isNaN(secondsRaw) && secondsRaw > 0 ? Math.min(secondsRaw, 10) : 4; // default 4, max 10
		const durationMs = seconds * 1000;
		const canvas = document.createElement('canvas');
		canvas.className = 'picklist-path-confetti-global';
		Object.assign(canvas.style, {
			position: 'fixed',
			inset: '0',
			width: '100vw',
			height: '100vh',
			pointerEvents: 'none',
			zIndex: '9999'
		});
		document.body.appendChild(canvas);
		this._globalConfettiCanvas = canvas;
		const ctx = canvas.getContext('2d');
		const scale = window.devicePixelRatio || 1;
		const setSize = () => {
			canvas.width = window.innerWidth * scale;
			canvas.height = window.innerHeight * scale;
			canvas.style.width = '100vw';
			canvas.style.height = '100vh';
			ctx.setTransform(scale, 0, 0, scale, 0, 0);
		};
		setSize();
		// Optional: adjust on resize during animation
		const resizeHandler = () => setSize();
		window.addEventListener('resize', resizeHandler, { passive: true });
		const colors = ['#ff6f61', '#ffce00', '#2e95ff', '#6fd18c', '#9d78ff'];
		this._confettiPieces = Array.from({ length: 160 }, () => ({
			x: Math.random() * window.innerWidth,
			y: Math.random() * -window.innerHeight,
			size: 6 + Math.random() * 7,
			vy: 3 + Math.random() * 4,
			vx: -3 + Math.random() * 6,
			color: colors[Math.floor(Math.random() * colors.length)],
			rotation: Math.random() * 360,
			vr: -8 + Math.random() * 16
		}));
		const animate = () => {
			ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
			this._confettiPieces.forEach(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.rotation += p.vr;
				if (p.y > window.innerHeight) p.y = -20;
				if (p.x > window.innerWidth) p.x = 0; else if (p.x < 0) p.x = window.innerWidth;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate((p.rotation * Math.PI) / 180);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
				ctx.restore();
			});
			this._confettiAnimation = requestAnimationFrame(animate);
		};
		animate();
		this._confettiTimer = setTimeout(() => {
			this._teardownConfetti(resizeHandler);
		}, durationMs);
	}

	_teardownConfetti(resizeHandler) {
		if (this._confettiAnimation) cancelAnimationFrame(this._confettiAnimation);
		this._confettiAnimation = null;
		if (this._confettiTimer) clearTimeout(this._confettiTimer);
		this._confettiTimer = null;
		if (resizeHandler) window.removeEventListener('resize', resizeHandler);
		if (this._globalConfettiCanvas && this._globalConfettiCanvas.parentNode) {
			this._globalConfettiCanvas.parentNode.removeChild(this._globalConfettiCanvas);
		}
		this._globalConfettiCanvas = null;
		this._confettiRunning = false;
	}

	disconnectedCallback() {
		this._teardownConfetti();
	}

	_extractError(error) {
		if (!error) return 'Unknown error';
		if (Array.isArray(error.body)) return error.body.map((e) => e.message).join(', ');
		return error.body?.message || error.message || 'Unknown error';
	}
}
