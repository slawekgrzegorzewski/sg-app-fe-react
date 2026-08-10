# Project instructions

## English grammar feedback

Whenever the user writes conversational English in a prompt, append a short `English review` section to the end of the final response to help them learn English.

- If the English is correct and natural, say so briefly.
- If it can be improved, provide a corrected version and one or two concise explanations of the most useful corrections.
- Review the user's natural-language English, not source code, identifiers, file paths, logs, or quoted third-party text.
- Keep this section secondary to the main task and do not let it delay or interrupt the requested work.

## Local development browser login

When browser-based verification on the local development application (`localhost`) requires authentication:

- Use `slag` as the login.
- Use any non-empty string as the password and OTP; the development version does not verify these values.
- This shortcut applies only to the local development environment. Never assume that it works or is permitted in another environment.
