import React from 'react';
import { Text } from 'react-native-elements';
import LoadingIndicatorDots from '../components/LoadingIndicatorDots/LoadingIndicatorDots';
import { useDynamicStyles } from '../hooks';

type GlobalModalBodyProps = {
  message: string;
  loading?: boolean;
};

export default function GlobalModalBody({
  message,
  loading=false
}: GlobalModalBodyProps): React.ReactElement {
  const { mixins } = useDynamicStyles();
  return (
    <>
      <Text style={mixins.modalBodyText}>
        {message}
      </Text>
      {loading && <LoadingIndicatorDots />}
    </>
  );
}

export const getGlobalModalBody = (message: string, loading?: boolean): React.ReactElement => {
  return <GlobalModalBody message={message} loading={loading} />;
};
