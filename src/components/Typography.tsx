import { Text, type TextProps } from 'react-native';
import { fonts } from '../theme/tokens';

type Weight = 'regular' | 'semibold' | 'bold' | 'heavy';

const bodyFamily: Record<Weight, string> = {
  regular: fonts.body,
  semibold: fonts.bodySemi,
  bold: fonts.bodyBold,
  heavy: fonts.bodyHeavy,
};

/** Texto manuscrito (Patrick Hand) para títulos, verbos e rótulos lúdicos. */
export function Hand({ style, className, ...rest }: TextProps & { className?: string }) {
  return <Text {...rest} className={`text-graphite ${className ?? ''}`} style={[{ fontFamily: fonts.hand }, style]} />;
}

/** Texto corrido (Nunito). */
export function Body({
  weight = 'regular',
  style,
  className,
  ...rest
}: TextProps & { className?: string; weight?: Weight }) {
  return (
    <Text {...rest} className={`text-graphite ${className ?? ''}`} style={[{ fontFamily: bodyFamily[weight] }, style]} />
  );
}
