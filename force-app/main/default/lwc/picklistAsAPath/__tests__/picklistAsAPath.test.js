import { createElement } from '@lwc/engine-dom';
import PicklistAsAPath from 'c/picklistAsAPath';

// Helper to stub component internal state after wire responses
function seedComponent(element, { record, objectInfo, picklistValues, field }) {
    element.record = record;
    element.objectInfo = objectInfo;
    element.picklistValues = picklistValues;
    element.field = field;
}

describe('c-picklist-as-a-path', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('hides button until a different step is selected', async () => {
        const element = createElement('c-picklist-as-a-path', { is: PicklistAsAPath });
        element.updateButtonHidden = false;
        seedComponent(element, {
            field: 'Stage__c',
            record: { fields: { Stage__c: { value: 'A' } }, recordTypeId: 'rt1' },
            objectInfo: { fields: { Stage__c: { label: 'Stage' } } },
            picklistValues: [
                { value: 'A', label: 'A', index: 0 },
                { value: 'B', label: 'B', index: 1 }
            ]
        });

        document.body.appendChild(element);
        await Promise.resolve();

        // Initially no button
        expect(element.shadowRoot.querySelector('button')).toBeNull();

        // Simulate selecting same current value (A) -> still hidden
        element.selectedStepValue = 'A';
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('button')).toBeNull();

        // Select different value (B) -> button appears
        element.selectedStepValue = 'B';
        await Promise.resolve();
        const btn = element.shadowRoot.querySelector('button');
        expect(btn).not.toBeNull();
        expect(btn.textContent.trim()).toBe('Update to B');
    });

    it('does not show button when updateButtonHidden=true even if different step selected', async () => {
        const element = createElement('c-picklist-as-a-path', { is: PicklistAsAPath });
        element.updateButtonHidden = true;
        seedComponent(element, {
            field: 'Stage__c',
            record: { fields: { Stage__c: { value: 'A' } }, recordTypeId: 'rt1' },
            objectInfo: { fields: { Stage__c: { label: 'Stage' } } },
            picklistValues: [
                { value: 'A', label: 'A', index: 0 },
                { value: 'B', label: 'B', index: 1 }
            ]
        });

        it('allows moving away from closed value showing button', async () => {
            const element = createElement('c-picklist-as-a-path', { is: PicklistAsAPath });
            element.updateButtonHidden = false;
            element.closedLabel = 'CLOSED';
            seedComponent(element, {
                field: 'Stage__c',
                record: { fields: { Stage__c: { value: 'CLOSED' } }, recordTypeId: 'rt1' },
                objectInfo: { fields: { Stage__c: { label: 'Stage' } } },
                picklistValues: [
                    { value: 'OPEN', label: 'OPEN', index: 0 },
                    { value: 'CLOSED', label: 'CLOSED', index: 1 }
                ]
            });
            document.body.appendChild(element);
            await Promise.resolve();
            element.selectedStepValue = 'OPEN';
            await Promise.resolve();
            const btn = element.shadowRoot.querySelector('button');
            expect(btn).not.toBeNull();
            expect(btn.textContent.trim()).toBe('Update to OPEN');
        });

        document.body.appendChild(element);
        await Promise.resolve();
        element.selectedStepValue = 'B';
        await Promise.resolve();
        expect(element.shadowRoot.querySelector('button')).toBeNull();
    });
});