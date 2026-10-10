import 'server-only';
import { checkBotId } from 'botid/server';
import { readConfig, trustedIP } from './security';
import { QuotaError, QuotaService } from './quota';
import { BlobQuotaStore } from './blob-store';
import { DemoQuotaStore } from './demo-store';
import { buildPayload, callProvider, demoResult } from './provider';
import { createHandlers } from './handlers';
const demoStore = new DemoQuotaStore();
export function handlers() {
  const config = readConfig();
  const quota = new QuotaService(config.mode === 'live' ? new BlobQuotaStore(config.blobToken!) : demoStore, config.quotaSecret);
  return createHandlers({config,quota,now:()=>new Date(),ip:request=>trustedIP(request,config),
    bot:async()=>{
      if (!config.production) return;
      const verdict = await checkBotId({developmentOptions:{isDevelopment:false},advancedOptions:{checkLevel:'basic'}});
      if (verdict.isBot || !verdict.isHuman || verdict.bypassed) throw new QuotaError('BOT_BLOCKED');
    },
    convert:async(input,signal)=>config.mode === 'live' ? callProvider(buildPayload(input),config.openrouterKey!,signal) : demoResult(input),
  });
}
