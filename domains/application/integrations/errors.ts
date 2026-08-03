export class ProviderError extends Error { constructor(readonly code:string){super(code);this.name=new.target.name} }
export class UnsupportedProviderError extends ProviderError {constructor(){super("PROVIDER_UNSUPPORTED")}}
export class ProviderConfigurationError extends ProviderError {constructor(){super("PROVIDER_CONFIGURATION_INVALID")}}
export class ProviderAuthenticationError extends ProviderError {constructor(){super("PROVIDER_AUTHENTICATION_FAILED")}}
export class ProviderRateLimitError extends ProviderError {constructor(){super("PROVIDER_RATE_LIMITED")}}
export class ProviderTemporaryError extends ProviderError {constructor(code="PROVIDER_TEMPORARY_FAILURE"){super(code)}}
export class ProviderPermanentError extends ProviderError {constructor(code="PROVIDER_PERMANENT_FAILURE"){super(code)}}
