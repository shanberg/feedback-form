<svelte:options tag="feedback-form" />

<script>
  export let showFeedbackDialog = true;
  export let callback = () => null;

  // Default contents
  export let defaultApp = "drive-ui";
  export let defaultEmail = "";
  export let defaultBody = "";
  export let defaultMessageType = "";

  // Default labels, messages, etc.
  export let emailLabel = "Email Address";
  export let emailPlaceholder = "name@provider";
  export let emailHelp = "We'll only contact you about this feedback";

  export let bodyLabel = "Message";
  export let bodyHelp = "";
  export let bodyPlaceholder = "";

  export let submitButtonLabel = "";
  export let thanksMessage = "Thanks for submitting your feedback!";

	// Message types and options
  export let options = [
    {
      messageType: "general",
      label: "General",
    },
    {
      messageType: "bug-report",
      label: "Report Issue",
			submitButtonLabel: "Send Report",
			bodyHelp: 'Please include steps to reproduce the problem, your operating system, what happened, and what you expected to happen.'
    },
    {
      messageType: "feature-request",
      label: "Request Feature",
			submitButtonLabel: "Send Request",
			bodyHelp: 'What is the feature? Why is this feature needed?'
    },
  ];

  // Timings
  export let thanksMessageShowDuration = 1000;
  export let transitionDuration = 250;

  // Internal
  let showingThanksMessage = false;
  let app = defaultApp;
  let email = defaultEmail;
  let body = defaultBody;
  let messageType = defaultMessageType;

  $: currentOpt =
    options.find((opt) => opt.messageType === messageType) || options[0];
  $: _emailPlaceholder =
    currentOpt.emailPlaceholder || emailPlaceholder || undefined;
  $: _emailLabel = currentOpt.emailLabel || emailLabel || "Email Address";
  $: _emailHelp = currentOpt.emailHelp || emailHelp || undefined;
  $: _bodyHelp = currentOpt.bodyHelp || bodyHelp || undefined;
  $: _bodyLabel = currentOpt.bodyLabel || bodyLabel || "Message";
  $: _thanksMessage =
    currentOpt.thanksMessage || thanksMessage || "Thanks for your feedback!";
  $: _bodyPlaceholder =
    currentOpt.bodyPlaceholder || bodyPlaceholder || undefined;
  $: _submitButtonLabel =
    currentOpt.submitButtonLabel || submitButtonLabel || "Send Feedback";
	$: canSubmitButton = body !== '';

  // Functions
  function handleClickHelpButton() {
    showFeedbackDialog = !showFeedbackDialog;
  }

  function resetForm() {
    body = "";
  }

  function closeDialog() {
    showFeedbackDialog = false;
  }

  function handlePressCancel() {
    resetForm()
    closeDialog()
  }

  function showThanksMessage() {
    showingThanksMessage = true;
    setTimeout(() => {
      showingThanksMessage = false;
    }, thanksMessageShowDuration);
  }

  function submitFeedback() {
    const newFeedback = {
      type: messageType,
      body: body,
      email: email,
      app: app,
    };
    callback(newFeedback);
    resetForm();
    closeDialog();
    showThanksMessage();
  }

	function handlePressSubmit() {
		submitFeedback();
	}
</script>

<button on:click={handleClickHelpButton}>help</button>

{#if showFeedbackDialog}
  <main
    class="feedback-dialog feedback"
  >
    <header>
      <h1>Feedback</h1>
    </header>
    <div class="form">
      <div class="type-picker">
        {#each options as option}
          <button
            class:current={currentOpt.messageType === option.messageType}
            on:click={() => (messageType = option.messageType)}
            >{option.label}</button
          >
        {/each}
      </div>
      <input type="hidden" value={app} />
      <input type="hidden" value={window.navigator.userAgent} />
      <label
        ><span class="label">{_emailLabel}</span>
        <input type="text" placeholder={_emailPlaceholder} bind:value={email} />
        {#if _emailHelp}<span class="help">{_emailHelp}</span>{/if}
      </label>
      <label
        ><span class="label">{_bodyLabel}</span>
        <textarea
          rows="10"
          placeholder={_bodyPlaceholder}
          bind:value={body}
        />
        {#if _bodyHelp}<span class="help">{_bodyHelp}</span>{/if}
      </label>
			<footer>
				<button on:click={() => handlePressCancel()}>Cancel</button>
				<button disabled={!canSubmitButton} messageType="submit" on:click={() => handlePressSubmit()}>
					{_submitButtonLabel}
				</button>
			</footer>
    </div>
  </main>
{/if}

{#if showingThanksMessage}
  <div
    class="thanks-message feedback"
  >
    {_thanksMessage}
  </div>
{/if}

<style>
	.feedback {

    --_color-background: var(--color-background, #fff);
    --_color-border: var(--color-border, rgba(0,0,0,0.08));
    --_color-shadow: var(--color-shadow, rgba(0,0,0,0.1));
    --_color-highlight: var(--color-highlight, blue);
    --_color-body-text: var(--color-body-text, #000);
    --_color-body-text---muted: var(--color-body-text---muted, rgba(0, 0, 0, 0.7));

		--_shadow: var(--shadow, 0 0.125rem 0.25rem var(--_color-shadow));
		--_font-size: var(--font-size, 1rem);

    --_control-margin: var(--control-margin, 0.25rem);
    --_control-padding: var(--control-padding, 0.25rem 0.5rem);
    --_control-border-radius: var(--control-border-radius, 0.25rem);

    --_control-background: var(--control-background, #ddd);
    --_control-text: var(--control-background, #000);
    --_control-border: var(--control-border, 0);

    --_control-background---current: var(--control-background, var(--_color-highlight));
    --_control-color---current: var(--control-background, #fff);
    --_control-border---current: var(--control-border, 0);

    --_control-background---current: var(--control-background, var(--_color-highlight));
    --_control-color---current: var(--control-background, #fff);
    --_control-border---current: var(--control-border, 0);

		--_field-background: var(--_field-background, var(--_color-background));
		--_field-border: var(--field-border, 1px solid var(--_color-border));
		--_field-color: var(--field-color, var(--_color-body-text));
		--_field-padding: var(--field-padding, var(--_control-padding));

		--_field-background---current: var(--_field-background---current, var(--_color-background));
		--_field-border---current: var(--field-border---current, 1px solid var(--_color-highlight));
		--_field-color---current: var(--field-color---current, var(--_color-body-text));

		--_form-shadow: var(--form-shadow, var(--_shadow));
    --_form-outer-spacing: var(--form-outer-spacing, 1rem);
    --_form-inner-spacing: var(--form-inner-spacing, 1rem);
    --_form-max-width: var(--form-max-width, 21em);
    --_form-border-radius: var(--form-border-radius, 0.5rem);
    --_form-background: var(--form-background, #fff);
    --_form-border: var(--form-border, 1px solid var(--_color-border));
    --_form-shadow: var(--form-shadow, 0 0.5rem 0.5rem var(--_color-shadow));
    --_form-font-family: var(--form-font-family, inherit);

		--_thanks-shadow: var(--thanks-shadow, var(--_shadow));
		--_thanks-font-family: var(--thanks-font-family, inherit);
		--_thanks-background: var(--thanks-background, var(--_color-background));
		--_thanks-color: var(--thanks-color, var(--_color-body-text));
		--_thanks-padding: var(--thanks-padding, 1rem);
		--_thanks-border-radius: var(--thanks-border-radius, 0.5rem);
  }

  @keyframes appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes disappear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  * {
    box-sizing: border-box;
  }

  button.current {
    border: 1px solid blue;
  }


	.feedback-dialog,
	.thanks-message {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.feedback-dialog {
		box-shadow: var(--_form-shadow);
    font-family: var(--_form-font-family);
    border-radius: var(--_form-border-radius);
    border: var(--_form-border);
    width: var(--_form-max-width);
    padding: var(--_form-inner-spacing);
    animation: appear 1s both;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    max-height: calc(100vh - (var(--_form-outer-spacing) / 2));
    max-width: calc(100vw - (var(--_form-outer-spacing) / 2));
	}

	.thanks-message {
		--background: #fff;
		background: var(--_thanks-background);
		box-shadow: var(--_thanks-shadow);
		font-family: var(--_thanks-font-family);
		padding: var(--_thanks-padding);
		border-radius: var(--_thanks-border-radius);
		width: max-content;
		max-width: 90%;
	}

	header {

	}

	footer {
		display: flex;
		justify-content: flex-end;
	}

	footer button {
		margin-inline-start: 0.5rem;
	}

  h1 {
    margin: 0;
    padding: 0 0 0.5rem;
    font-size: var(--_font-size);
  }

  .form {
    display: flex;
    flex-direction: column;
  }

  label {
    display: flex;
    flex-direction: column;
    align-items: stretch;
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
  }

	input,
	textarea {
		margin-top: 0.125rem;
		margin-bottom: 0.25rem;
		padding: var(--_field-padding);
		font: inherit;

		background: var(--_field-background);
		color: var(--_field-color);
		border: var(--_field-border);
	}

	label input:focus,
	label textarea:focus {
		background: var(--_field-background---current);
		color: var(--_field-color---current);
		border: var(--_field-border---current);
	}

  label span {
    font-size: var(--_font-size);
    margin-bottom: 0.25rem;
  }

	label .help {
		font-size: 85%;
		color: var(--_color-body-text---muted);
	}

  input,
  textarea {
    border-radius: var(--_control-border-radius);
  }

  .type-picker {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
		margin: -0.25rem;
		justify-content: space-between;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--_color-border);
		margin-bottom: 0.5rem;
  }

	.type-picker button {
		margin: 0.25rem;
	}

  button {
    appearance: none;
    background: var(--_control-background);
    padding: var(--_control-padding);
    border-radius: var(--_control-border-radius);
    border: var(--_control-border);
  }

  button.current {
    background: var(--_control-background---current);
    border: var(--_control-border---current);
    color: var(--_control-color---current);
  }

	/* Extra Styles */
	/* */
	/* */
	/* */
	/* */
	/* */
	/* */
	/* */
	/* */
	/* */
	/* */
	/* */
	input,
	textarea {
		border: 1px solid rgba(0,0,0,0.08);
		background: rgba(0,0,0,0.02);
		background-clip: padding-box;
		transition: border 0.1s ease;
	}

	label .label {
		font-size: 70%;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--_color-body-text---muted);
	}

	input:focus,
	textarea:focus {
		outline: none;
	}


  button:hover {
    filter: brightness(110%);
  }


	.feedback-dialog {
		--color-highlight: #00b42b;
		--color-border: rgba(0,0,0,0.08);
	}

</style>
