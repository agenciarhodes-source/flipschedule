export class DatabaseConfigurationError extends Error {
  readonly code = "DATABASE_CONFIGURATION_ERROR";

  constructor(message = "A configuração de banco de dados do servidor é inválida.") {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}
