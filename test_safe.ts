import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { toWebAuthnAccount } from 'viem/account-abstraction';
import { toSafeSmartAccount } from 'permissionless/accounts';

const publicClient = createPublicClient({ chain: polygonAmoy, transport: http() });

const webAuthnAccount = toWebAuthnAccount({
  credential: {
    id: '0x123',
    publicKey: '0x321',
  },
});

async function main() {
  const account = await toSafeSmartAccount({
    client: publicClient,
    owners: [webAuthnAccount],
    version: '1.4.1',
  });
  console.log(account.address);
}
