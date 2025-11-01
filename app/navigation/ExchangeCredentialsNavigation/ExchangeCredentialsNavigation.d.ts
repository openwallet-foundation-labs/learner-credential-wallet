import { StackScreenProps } from '@react-navigation/stack';
import { VcApiCredentialRequest } from '../../types/chapi';
import { WalletApiMessage } from '../../lib/vcApi';

export type ExchangeCredentialsNavigationParamList = {
  ExchangeCredentials: { message: WalletApiMessage };
};

export type ExchangeCredentialsProps = StackScreenProps<ExchangeCredentialsNavigationParamList, 'ExchangeCredentials'>;
