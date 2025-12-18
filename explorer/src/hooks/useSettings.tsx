import { useCallback, useEffect, useState } from "react";
import { loadSettings, type Settings } from "@/lib/settings";

export function useSettings(): [Settings, () => void] {
	const [currentSettings, setCurrentSettings] = useState(loadSettings());
	const load = useCallback(async () => {
		setCurrentSettings(loadSettings());
	}, []);
	useEffect(() => {
		load();
	}, [load]);
	return [
		currentSettings,
		() => {
			load();
		},
	];
}
