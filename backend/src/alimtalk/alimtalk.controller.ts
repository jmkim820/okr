import { Body, Controller, Post } from '@nestjs/common';
import { AlimtalkService } from './alimtalk.service';

interface SendLeaveDto {
  name: string;
  message: string;
  recipientPhones: string[];
}

@Controller('alimtalk')
export class AlimtalkController {
  constructor(private readonly service: AlimtalkService) {}

  @Post('leave')
  sendLeave(@Body() body: SendLeaveDto) {
    return this.service.sendLeaveNotification(body);
  }
}
