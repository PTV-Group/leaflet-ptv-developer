module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			control: {
				src: ['src/TileLayer.ClickableTiles.js'],
				dest: 'dist/leaflet-xserver-src.js',
				options: {
					transform: [
						[
							'browserify-shim',
							{
								'leaflet': 'global:L'
							}
						],
					],
					browserifyOptions: {
						standalone: 'leaflet-xserver'
					}
				}
			}
		},
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
				'<%= grunt.template.today("yyyy-mm-dd") %> */\n\n',
				sourceMap: 'dist/leaflet-xserver-src.js'
			},
			build: {
				src: 'dist/leaflet-xserver-src.js',
				dest: 'dist/leaflet-xserver.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('default', ['browserify', 'uglify']);
};
