const { createLogger, format, transports } = require('winston')
const { combine, timestamp, label, printf, colorize } = format

const logger = function (moduleName = '') {
    const moduleLabel = (moduleName !== '') ? `[${moduleName}] ` : ``
    const fullLabel = ``
    return createLogger({
        level: 'info',
        format: combine(
            label({ label: fullLabel }),
            timestamp(),
            colorize(),
            printf(info => {
                return `${info.label} [${info.level}]: ${moduleLabel}${info.message}`
            })
        ),
        transports: [
            new transports.Console(),
        ],
    })
}

module.exports = logger
