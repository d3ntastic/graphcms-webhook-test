/* eslint-disable no-console */
import { createHmac } from 'crypto'
import fetch from 'cross-fetch'
import { languages } from '../../../services/languageService'

const verifySignature = (signature, body) => {
	const [rawSign, rawEnv, rawTimestamp] = signature.split(', ')

	const sign = rawSign.replace('sign=', '')
	const environmentName = rawEnv.replace('env=', '')
	const timestamp = parseInt(rawTimestamp.replace('t=', ''), 10)
	const secret = process.env.GRAPHCMS_WEBHOOK_SECRET
	const payload = JSON.stringify({
		Body: JSON.stringify(body),
		environmentName,
		TimeStamp: timestamp,
	})

	const hash = createHmac('sha256', secret).update(payload).digest('base64')

	return sign === hash
}

export default async function handler(req, res) {
	const {
		headers: {
			host,
		},
		body,
	} = req

	const debugRequest = await fetch('https://211278b77ae791bae79999f115a0efed.m.pipedream.net', {
		method: 'POST',
		headers: { 'Content-Type':'application/json' },
		
		body: body,
	});
	
	const signature = req.headers['gcms-signature']
	if (signature) {
		const isValid = verifySignature(signature, body)

		if (isValid) {
			const isoLanguages = languages.values.reduce((acc, language) => {
				const { iso, code } = language
				return { ...acc, [iso]: code }
			}, {})

			const handledUrls = []
			body.data.localizations.forEach(async ({ locale, urlIdentifier }) => {
				const pageUrl = `//${host}/${isoLanguages[locale]}/${urlIdentifier}?purge=1&secret=${process.env.GRAPHCMS_WEBHOOK_SECRET}`
				try {
					handledUrls.push(pageUrl)
					console.log(pageUrl)
				} catch (err) {
					console.error(err)
				}
			})
			res.status(200).send(
				JSON.stringify(handledUrls),
			)
		} else {
			console.log('Not authorized')
			res.status(401).send(
				'Not authorized',
			)
		}
	} else {
		console.log('Not authorized')
		res.status(401).send(
			'Not authorized',
		)
	}
}
