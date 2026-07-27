export class ApiResponse {
  constructor({ message, data = null, meta = {} }) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}
