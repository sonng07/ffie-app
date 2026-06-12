import { useEffect, useRef } from "react";
import { registerSnapTarget } from "@unicorn-studio/snap-bridge";

/**
 * Wire a screen's content View into snap-bridge so Capture's full-page
 * snapshot covers the entire scrollable content (off-screen included).
 *
 * Usage:
 *   const ref = useSnapTarget();
 *   return (
 *     <ScrollView>
 *       <View ref={ref} collapsable={false}>{content}</View>
 *     </ScrollView>
 *   );
 */
export function useSnapTarget() {
	const ref = useRef(null);
	useEffect(() => {
		registerSnapTarget(ref);
		return () => registerSnapTarget(null);
	}, []);
	return ref;
}
