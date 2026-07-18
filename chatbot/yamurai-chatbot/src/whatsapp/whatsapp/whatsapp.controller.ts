/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  Logger
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('test')
  testGetResponse(): string {
    return this.whatsappService.getTestMessage();
  }

  @Get('webhook')
  whatsappVerificationChallenge(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
  ) {
    // this.logger.log(`Webhook verification attempt: mode=${mode}, token=${token}`);
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleIncomingWhatsappMessage(@Body() request: any) {
    this.logger.log('Received webhook payload');

    try{
        // Log the incoming request for debugging
        if (request?.entry?.[0]?.changes?.[0]?.value?.messages) {
            const messages = request.entry[0].changes[0].value.messages;
            messages.forEach((msg: any) => {
                this.logger.log(`Processing message from ${msg.from}: type=${msg.type}`);
            });
        }

        // Process the message
        await this.whatsappService.handleIncomingMessage(request);

        return {status: 'success', message: 'Message Processed'};
    } catch (error:any) {
        this.logger.log('Error processing webhook:', error);
        return {status: 'error', message: error.message};
    }
  }
}