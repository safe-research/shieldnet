export const log = (msg: unknown) => {
	if (process.env.VERBOSE) console.log(msg);
};
