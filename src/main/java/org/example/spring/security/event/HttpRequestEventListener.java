package org.example.spring.security.event;

import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.support.ServletRequestHandledEvent;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class HttpRequestEventListener {
	@EventListener
	public void onRequestHandled(ServletRequestHandledEvent event) {
		log.debug("Request Handled: [Method: {}, URL: {}, Client IP: {}, Status: {}, Time: {} ms]",
			event.getMethod(),
			event.getRequestUrl(),
			event.getClientAddress(),
			event.getStatusCode(),
			event.getProcessingTimeMillis()
		);

		if (event.getStatusCode() == HttpStatus.NOT_FOUND.value()) {
			log.debug("404 Not Found: URL: {}", event.getRequestUrl());
			// 여기에 404 오류에 대한 추가 처리 로직 구현
		} else if (event.getStatusCode() >= 400) {
			log.debug("Error occurred: Status: {}, URL: {}", event.getStatusCode(), event.getRequestUrl());
			// 다른 오류 상태에 대한 처리
		}
	}
}
