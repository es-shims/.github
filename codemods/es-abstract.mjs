function isRequire(j, declaration) {
	return declaration.init // Make sure there is an initialization
		&& j.CallExpression.check(declaration.init) // Make sure it's a call expression
		&& declaration.init.callee.name === 'require' // Ensure the callee is 'require'
		&& declaration.init.arguments.length === 1 // Ensure there is one argument
		&& j.Literal.check(declaration.init.arguments[0]); // Ensure the argument is a literal
}

export default function (fileInfo, { jscodeshift: j }) {
	const latestYear = 2024;

	return j(fileInfo.source)
		.find(j.VariableDeclaration)
		.forEach((path) => {
			path.node.declarations.filter(x => isRequire(j, x)).forEach((declaration) => {
				const specifier = declaration.init.arguments[0].value;
				if (specifier.startsWith('es-abstract/')) {
					const [, year] = specifier.match(/^es-abstract\/(\d+)\//) ?? [];
					if (year) {
						const newSpecifier = specifier.replace(year, latestYear);
						try {
							require.resolve(newSpecifier, { paths: [fileInfo.path] });

							declaration.init.arguments[0].value = newSpecifier;
						} catch {
							console.log(`Could not find ${specifier.replace(year, latestYear)} from ${fileInfo.path}`);
							process.exitCode ||= 1;
						}
					}
				} else if (/\/aos\//.test(specifier)) {
					const [, aoFile] = specifier.match(/\/aos\/([^\/]+)$/) ?? [];
					if (aoFile) {
						const newSpecifier = `es-abstract/${latestYear}/${aoFile}`;
						try {
							require.resolve(newSpecifier, { paths: [fileInfo.path] });

							declaration.init.arguments[0].value = newSpecifier;

							console.log(`replacing local AO with ${newSpecifier}`);
						} catch { /**/ }
					}
				}
			});
		})
		.toSource();
};

