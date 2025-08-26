export class ApiResponse {
  static success<T>(data: T, message = 'Operação realizada com sucesso') {
    return {
      success: true,
      data,
      message,
    };
  }

  static error(message = 'Ocorreu um erro', code = 400) {
    return {
      success: false,
      message,
      code,
    };
  }
}
