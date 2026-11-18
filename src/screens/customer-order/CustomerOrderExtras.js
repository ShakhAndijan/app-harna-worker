import { View } from 'react-native';
import { DepositBlock, PaymentBlock } from './PayBlocks';
import { ArrivalCheckCard, ComplaintAnswerCard, GuaranteeSection } from './SafetyBlocks';
import { ReviewForm, CustomerFinalComment } from './ReviewBlocks';

// Saytdagi mijoz kabineti bilan bir xil qo'shimcha bloklar: omonat, kelish tekshiruvi, shikoyatga
// javob (faol buyurtma) va to'lov, kafolat, sharh, yakuniy izohlar (tugagan buyurtma).
export default function CustomerOrderExtras({ order, onChanged }) {
  const done = order.rawStatus === 'completed';
  const active = order.rawStatus === 'active';
  return (
    <View style={{ gap: 12 }}>
      <DepositBlock order={order} onChanged={onChanged} />
      {active && <ArrivalCheckCard order={order} onChanged={onChanged} />}
      <ComplaintAnswerCard order={order} onChanged={onChanged} />
      {done && !!order.workerId && <PaymentBlock order={order} onChanged={onChanged} />}
      {done && <GuaranteeSection order={order} onChanged={onChanged} />}
      {done && !!order.workerId && <ReviewForm order={order} onChanged={onChanged} />}
      {done && <CustomerFinalComment order={order} onChanged={onChanged} />}
    </View>
  );
}
