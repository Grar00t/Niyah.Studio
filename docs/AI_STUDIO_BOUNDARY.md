# AI Studio Boundary

Google AI Studio is a development environment for this repository, not a runtime dependency of Niyah Studio.

The downloadable product must keep working when disconnected from Google services and without a Gemini API key.

Forbidden product-runtime additions unless the repository owner explicitly changes this contract:

- Gemini / GenAI SDK calls;
- Firebase services;
- Google Analytics, Tag Manager, advertising, marketing, or tracking SDKs;
- hidden remote logging or dataset upload;
- provider authentication required to use local Niyah.Engine functionality.

The development agent may use AI Studio capabilities to edit/build/test the repository, but it must not wire those capabilities into the shipped application.
