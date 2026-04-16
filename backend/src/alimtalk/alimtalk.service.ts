import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendLeavePayload {
  name: string;
  message: string;
  recipientPhones: string[];
}

@Injectable()
export class AlimtalkService {
  private readonly logger = new Logger(AlimtalkService.name);

  constructor(private readonly config: ConfigService) {}

  async sendLeaveNotification(payload: SendLeavePayload): Promise<{ success: true; sentCount: number }> {
    const { name, message, recipientPhones } = payload;

    if (!name || !message || !Array.isArray(recipientPhones) || recipientPhones.length === 0) {
      throw new BadRequestException('name, message, recipientPhones가 필요합니다.');
    }

    const appkey = this.config.get<string>('NHN_APPKEY');
    const secretKey = this.config.get<string>('NHN_SECRET_KEY');
    const senderKey = this.config.get<string>('NHN_SENDER_KEY');
    const templateCode = this.config.get<string>('NHN_TEMPLATE_CODE');

    if (!appkey || !secretKey || !senderKey || !templateCode) {
      throw new InternalServerErrorException('NHN 인증 정보가 설정되지 않았습니다.');
    }

    const url = `https://api-alimtalk.cloud.toast.com/alimtalk/v2.3/appkeys/${appkey}/messages`;
    const body = {
      senderKey,
      templateCode,
      recipientList: recipientPhones.map((phone) => ({
        recipientNo: phone,
        templateParameter: { 이름: name, 메세지: message },
      })),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Secret-Key': secretKey,
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.header?.resultCode !== 0) {
      this.logger.error(`알림톡 발송 실패: ${res.status} ${JSON.stringify(data)}`);
      throw new InternalServerErrorException(`알림톡 발송 실패: ${data?.header?.resultMessage || res.statusText}`);
    }

    return { success: true, sentCount: recipientPhones.length };
  }
}
