export interface EmailAdapter {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}
