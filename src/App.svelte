<svelte:options tag="feedback-form" />

<script>
  import { fade } from "svelte/transition";
  export let showFeedbackDialog = false;
  export let callback = () => null;

  // Default contents
  export let defaultApp = "drive-ui";
  export let defaultEmail = "";
  export let defaultBody = "";
  export let defaultMessageType = "asdf";

  // Default labels, messages, etc.
  export let emailLabel = "Email Address";
  export let emailPlaceholder = "phil.lee@greymatter.io";
  export let emailHelp = "probably includes an '@' symbol";

  export let bodyLabel = "Message";
  export let bodyHelp = "Please be helpful and considerate";
  export let bodyPlaceholder = "Please add your cool message";

  export let submitButtonLabel = "Submit Feedback";
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
			bodyHelp: 'Include any steps to reproduce'
    },
    {
      messageType: "feature-request",
      label: "Request Feature",
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
    currentOpt.submitButtonLabel || submitButtonLabel || "Submit Feedback";
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
    class="feedback-dialog"
    transition:fade={{ duration: transitionDuration }}
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
      <label
        ><span>{_emailLabel}</span>
        <input type="text" placeholder={_emailPlaceholder} bind:value={email} />
        {#if _emailHelp}<span class="help">{_emailHelp}</span>{/if}
      </label>
      <label
        ><span>{_bodyLabel}</span>
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
    transition:fade={{ duration: transitionDuration }}
    class="thanks-message"
  >
    {_thanksMessage}
  </div>
{/if}

<style>
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

  .thanks-message {
    --background: #fff;
  }

  main {
    --_color-background: var(--color-background, #fff);
    --_color-border: var(--color-border, #eee);
    --_color-shadow: var(--color-shadow, #000);
    --_color-body-text: var(--color-body-text, #000);
    --_color-body-text---muted: var(--color-body-text---muted, rgba(0, 0, 0, 0.7));

    --_control-margin: var(--control-margin, 0.25rem);
    --_control-padding: var(--control-padding, 0.25rem 0.5rem);
    --_control-border-radius: var(--control-border-radius, 0.25rem);

    --_control-background: var(--control-background, #ddd);
    --_control-text: var(--control-background, #000);
    --_control-border: var(--control-border, 0);

    --_control-background---current: var(--control-background, #blue);
    --_control-color---current: var(--control-background, #fff);
    --_control-border---current: var(--control-border, 0);

    --_font-size: var(--font-size, 1rem);
    --_form-outer-spacing: var(--form-outer-spacing, 1rem);
    --_form-inner-spacing: var(--form-inner-spacing, 1rem);
    --_form-max-width: var(--form-max-width, 20em);
    --_form-border-radius: var(--form-border-radius, 0.5rem);
    --_form-background: var(--form-background, #fff);
    --_form-border: var(--form-border, 1px solid);
    --_form-font-family: var(--form-font-family, inherit);

    max-height: calc(100vh - (var(--_form-outer-spacing) / 2));
    max-width: calc(100vw - (var(--_form-outer-spacing) / 2));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    font-family: var(--_form-font-family);
    border-radius: var(--_form-border-radius);
    border: var(--_form-border);
    max-width: var(--_form-max-width);
    padding: var(--_form-inner-spacing);
    animation: appear 1s both;
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
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

	label input {
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
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
    border: 1px solid;
  }

  .type-picker {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .type-picker button {
    appearance: none;
    background: var(--_control-background);
    padding: var(--_control-padding);
    border-radius: var(--_control-border-radius);
    border: var(--_control-border);
  }

  .type-picker .current {
    background: blue;
    color: white;
  }

  .type-picker button:hover {
    filter: brightness(110%);
  }
</style>
