# Picklist As A Path (LWC)
A Lightning Web Component that renders any picklist field as a Salesforce Path-like UI with lightweight stage selection, update actions, success toast, and optional full‑page confetti celebration when the final (closed) value is chosen.

## Features
- Dynamic rendering of any picklist field (record type aware)
- Click to select a new status; button adapts contextually. Behaviour identical to a standard Path.
- Toast notifications on successful update or errors
- Optional confetti on close with configurable duration (default 4s, max 10s)

<img width="848" height="151" alt="image" src="https://github.com/user-attachments/assets/43420d95-7a7b-4188-98d3-fed85ec7b51a" />

<img width="860" height="304" alt="image" src="https://github.com/user-attachments/assets/85e98272-c837-4321-949d-3ef0f3ac2430" />



## Component API (Design Attributes)
Add the custom component 'Picklist as a Path' to a Lightning Record Page and configure:

- field | String | Yes | API name of the picklist field to visualize (e.g. `StageName`, `Status__c`). |
- closedLabel | String | Yes | The exact picklist value considered “closed / final”. Triggers confetti (if enabled) and disables default advance action. |
- updateButtonHidden | Boolean | No | Hide the action button entirely (selection still highlights but no update control). |
- confettiOnClose | Boolean | No | When true, launching an update to the closed value triggers full‑screen confetti. |
- confettiDurationSeconds | Integer | No | Length of the confetti animation (default 4, maximum 10). Values <=0 ignored reverting to default. |


## Confetti Details
- Confetti can be enabled or disabled from the properties in App Builder.
- A duration can be set up to 10 secons for Confetti to appear on users console when the path is updated to the Closed status.


## Error Handling Strategy
- Central helper `_showToast` for consistent toast emission.
- `_handleWireError` consolidates wire adapter failures.
- All caught exceptions normalized through `_extractError` (supports array bodies, standard errors, or unknowns).
- User sees both inline banner and toast for critical issues.

Deployment Instructions Using VS Code and Manifest File
You can deploy the component using VS Code and a manifest file (package.xml):

## Deployment Instructions Using VS Code and Manifest File

You can deploy the component using VS Code and a manifest file (`package.xml`):

1. Open the project in VS Code with Salesforce Extensions installed.
2. Make sure you are authorized to your org:
	- Open the Command Palette (Ctrl+Shift+P) and run `SFDX: Authorize an Org`.
3. Right-click the `manifest/package.xml` file and select `SFDX: Deploy Source in Manifest to Org`.
4. Wait for the deployment to complete. You will see the results in the Output panel.

This will deploy all metadata listed in your `package.xml`, including the `picklistAsAPath` LWC.


### Using Change Sets
1. Add the `picklistAsAPath` LWC folder to a change set.
2. Upload and deploy the change set to your target org.



## Notes
- Make sure the user has field-level security access to the fields you want to display/edit.
- The component can be reused for any set of fields by setting the `Path Field`–`Closed Label` properties in App Builder.


## Author
Joshua Withers  
GitHub: https://github.com/DrummerJW
